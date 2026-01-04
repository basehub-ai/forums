"use client"

import { Collapsible } from "@base-ui/react/collapsible"
import type { ToolUIPart } from "ai"
import { Fragment, type ReactNode, useEffect, useState } from "react"
import { Streamdown } from "streamdown"
import type { AgentToolName, AgentTools } from "@/agent/tools"
import type { AgentUIMessage } from "@/agent/types"
import { ERROR_CODES } from "@/lib/errors"

type ExtractNonAsync<T> = T extends AsyncIterable<infer U> ? U : T
type InferToolResult<T> = T extends {
  execute: (...args: infer _P) => infer R
}
  ? ExtractNonAsync<Awaited<R>>
  : never
type ToolResult<N extends AgentToolName> = InferToolResult<AgentTools[N]>

function Tool({
  id,
  name,
  summary,
  detail,
}: {
  id: string
  name: string
  summary: ReactNode
  detail: ReactNode
}) {
  const storageKey = `tool-expanded-${id}`
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(storageKey)
    if (stored === "true") {
      setExpanded(true)
    }
  }, [storageKey])

  function toggle() {
    const next = !expanded
    setExpanded(next)
    localStorage.setItem(storageKey, String(next))
  }

  return (
    <div className="my-8">
      <button
        className="flex items-center gap-2 text-left"
        onClick={toggle}
        type="button"
      >
        <span
          className={`border px-1.5 py-0.5 font-medium text-xs uppercase ${
            expanded
              ? "border-highlight-blue bg-highlight-blue text-white"
              : "border-highlight-blue/30 bg-highlight-blue/10 text-highlight-blue"
          }`}
        >
          {name}
        </span>
        <span className="font-mono text-muted text-sm">{summary}</span>
      </button>
      {expanded && (
        <div className="mt-2 ml-0 border-highlight-blue/20 border-l-2 pl-3">
          {detail}
        </div>
      )}
    </div>
  )
}

type CommentContentProps = {
  content: AgentUIMessage[]
  isStreaming?: boolean
  isRetrying?: boolean
  onRetry?: () => void
}

export function CommentContent({
  content,
  isStreaming = false,
  isRetrying = false,
  onRetry,
}: CommentContentProps) {
  return (
    <div>
      {content.map((msg) => (
        <Fragment key={msg.id}>
          {msg.parts.map((part, idx) => {
            switch (part.type) {
              case "text": {
                const hasError: boolean =
                  msg.metadata?.errorCode === ERROR_CODES.STREAM_STEP_ERROR
                return (
                  <div data-from={msg.role} key={`${msg.id}-${idx}`}>
                    <div data-error={hasError || undefined}>
                      <div>
                        <Streamdown mode={isStreaming ? "streaming" : "static"}>
                          {part.text}
                        </Streamdown>
                      </div>
                    </div>
                    {msg.role === "assistant" && hasError && onRetry && (
                      <div data-actions>
                        <button
                          aria-label="Retry"
                          className="flex items-center gap-1 bg-highlight-yellow px-1.5 py-0.5 font-medium text-bright text-sm disabled:opacity-50"
                          disabled={isRetrying}
                          onClick={onRetry}
                          type="button"
                        >
                          {isRetrying ? "Retrying..." : "Retry"}
                        </button>
                      </div>
                    )}
                  </div>
                )
              }
              case "reasoning":
                return (
                  <Collapsible.Root
                    key={`${msg.id}-${idx}`}
                    open={Boolean(
                      isStreaming &&
                        idx === msg.parts.length - 1 &&
                        msg.id === content.at(-1)?.id
                        ? ""
                        : undefined
                    )}
                  >
                    <Collapsible.Trigger>Thinking...</Collapsible.Trigger>
                    <Collapsible.Panel>{part.text}</Collapsible.Panel>
                  </Collapsible.Root>
                )
              case "tool-Read": {
                const toolPart = part as ToolUIPart
                const output = toolPart.output as ToolResult<"Read"> | undefined
                const input = toolPart.input as { path?: string }
                return (
                  <Tool
                    detail={
                      output ? (
                        <pre className="overflow-x-auto text-xs">
                          <code>{output.content}</code>
                        </pre>
                      ) : undefined
                    }
                    id={toolPart.toolCallId}
                    key={`${msg.id}-${idx}`}
                    name="Read"
                    summary={input.path ?? "file"}
                  />
                )
              }
              case "tool-Grep": {
                const toolPart = part as ToolUIPart
                const output = toolPart.output as ToolResult<"Grep"> | undefined
                const input = toolPart.input as { pattern?: string }
                return (
                  <Tool
                    detail={
                      output ? (
                        <pre className="overflow-x-auto text-xs">
                          <code>{output.matches}</code>
                        </pre>
                      ) : undefined
                    }
                    id={toolPart.toolCallId}
                    key={`${msg.id}-${idx}`}
                    name="Grep"
                    summary={input.pattern ?? "pattern"}
                  />
                )
              }
              case "tool-List": {
                const toolPart = part as ToolUIPart
                const output = toolPart.output as ToolResult<"List"> | undefined
                const input = toolPart.input as { path?: string }
                return (
                  <Tool
                    detail={
                      output ? (
                        <pre className="overflow-x-auto text-xs">
                          <code>{output.listing || "(no files)"}</code>
                        </pre>
                      ) : undefined
                    }
                    id={toolPart.toolCallId}
                    key={`${msg.id}-${idx}`}
                    name="List"
                    summary={input.path ?? "."}
                  />
                )
              }
              case "tool-ReadPost": {
                const toolPart = part as ToolUIPart
                const output = toolPart.output as
                  | ToolResult<"ReadPost">
                  | undefined
                const input = toolPart.input as {
                  postNumber?: number
                  postOwner?: string
                  postRepo?: string
                }
                const ref = input.postOwner
                  ? `${input.postOwner}/${input.postRepo}#${input.postNumber}`
                  : `#${input.postNumber}`
                return (
                  <Tool
                    detail={
                      output ? (
                        <div className="text-sm">
                          <div className="font-medium">
                            {output.post.title ?? "Untitled"}
                          </div>
                          <div className="mt-1 text-muted">
                            {output.rootComment.content.slice(0, 200)}
                            {output.rootComment.content.length > 200
                              ? "..."
                              : ""}
                          </div>
                        </div>
                      ) : undefined
                    }
                    id={toolPart.toolCallId}
                    key={`${msg.id}-${idx}`}
                    name="Read Post"
                    summary={ref}
                  />
                )
              }
              case "tool-WebSearch": {
                const toolPart = part as ToolUIPart
                const input = toolPart.input as { query?: string }
                return (
                  <Tool
                    detail={
                      toolPart.output ? (
                        <pre className="overflow-x-auto text-xs">
                          <code>
                            {JSON.stringify(toolPart.output, null, 2)}
                          </code>
                        </pre>
                      ) : undefined
                    }
                    id={toolPart.toolCallId}
                    key={`${msg.id}-${idx}`}
                    name="Web Search"
                    summary={input.query ?? "search"}
                  />
                )
              }
              case "tool-WebExtract": {
                const toolPart = part as ToolUIPart
                const input = toolPart.input as { url?: string }
                return (
                  <Tool
                    detail={
                      toolPart.output ? (
                        <pre className="overflow-x-auto text-xs">
                          <code>
                            {JSON.stringify(toolPart.output, null, 2)}
                          </code>
                        </pre>
                      ) : undefined
                    }
                    id={toolPart.toolCallId}
                    key={`${msg.id}-${idx}`}
                    name="Extract"
                    summary={input.url ?? "url"}
                  />
                )
              }
              default: {
                if (part.type.startsWith("tool-") && "state" in part) {
                  const toolPart = part as ToolUIPart
                  const toolName = toolPart.type.slice(5)
                  return (
                    <Tool
                      detail={
                        toolPart.output ? (
                          <pre className="overflow-x-auto text-xs">
                            <code>
                              {JSON.stringify(toolPart.output, null, 2)}
                            </code>
                          </pre>
                        ) : undefined
                      }
                      id={toolPart.toolCallId}
                      key={`${msg.id}-${idx}`}
                      name={toolName}
                      summary={JSON.stringify(toolPart.input)}
                    />
                  )
                }
                return null
              }
            }
          })}
        </Fragment>
      ))}
    </div>
  )
}

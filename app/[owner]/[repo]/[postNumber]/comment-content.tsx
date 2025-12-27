"use client"

import { Collapsible } from "@base-ui/react/collapsible"
import type { ToolUIPart } from "ai"
import { CopyIcon, RefreshCcwIcon } from "lucide-react"
import { Fragment, type ReactNode } from "react"
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

const toolRenderers: Partial<
  Record<AgentToolName, (toolPart: ToolUIPart) => ReactNode>
> = {
  Read: (toolPart) => {
    const output = toolPart.output as ToolResult<"Read"> | undefined
    if (!output) {
      return null
    }
    return (
      <div>
        <div>
          <span>{output.metadata.path}</span>
          <span> - </span>
          <span>{output.metadata.fileSize}</span>
          {output.metadata.isPaginated ? (
            <>
              <span> - </span>
              <span>
                Lines {output.metadata.startLine}-{output.metadata.endLine} of{" "}
                {output.metadata.totalLines}
              </span>
            </>
          ) : null}
        </div>
      </div>
    )
  },
  Grep: (toolPart) => {
    const output = toolPart.output as ToolResult<"Grep"> | undefined
    return (
      <div data-state={toolPart.state} data-tool="Grep">
        <div>Grep</div>
        <div>
          {output ? (
            <div>
              <div>
                <span>Pattern: {output.summary.pattern}</span>
                <span> - </span>
                <span>
                  {output.summary.matchCount} matches in{" "}
                  {output.summary.fileCount} files
                </span>
              </div>
              <pre>
                <code>{output.matches}</code>
              </pre>
            </div>
          ) : (
            <pre>{JSON.stringify(toolPart.input, null, 2)}</pre>
          )}
        </div>
      </div>
    )
  },
  List: (toolPart) => {
    const output = toolPart.output as ToolResult<"List"> | undefined
    return (
      <div data-state={toolPart.state} data-tool="List">
        <div>List</div>
        <div>
          {output ? (
            <div>
              <div>
                <span>{output.summary.totalFiles} files</span>
                <span> - </span>
                <span>{output.summary.totalDirs} directories</span>
                {output.summary.depth !== undefined ? (
                  <>
                    <span> - </span>
                    <span>Depth: {output.summary.depth}</span>
                  </>
                ) : null}
              </div>
              <pre>
                <code>{output.listing}</code>
              </pre>
            </div>
          ) : (
            <pre>{JSON.stringify(toolPart.input, null, 2)}</pre>
          )}
        </div>
      </div>
    )
  },
}

function renderTool(toolName: string, toolPart: ToolUIPart) {
  const renderer = toolRenderers[toolName as AgentToolName]
  if (renderer) {
    return renderer(toolPart)
  }
  return (
    <div data-state={toolPart.state} data-tool={toolName}>
      <div>{toolName}</div>
      <div>
        <pre>{JSON.stringify(toolPart.input, null, 2)}</pre>
        {!!toolPart.output && (
          <pre>{JSON.stringify(toolPart.output, null, 2)}</pre>
        )}
        {!!toolPart.errorText && <div data-error>{toolPart.errorText}</div>}
      </div>
    </div>
  )
}

type CommentContentProps = {
  content: AgentUIMessage[]
  isStreaming?: boolean
  onRetry?: () => void
}

export function CommentContent({
  content,
  isStreaming = false,
  onRetry,
}: CommentContentProps) {
  if (typeof window !== "undefined") {
    console.log(content)
  }
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
                      <div>{part.text}</div>
                    </div>
                    {msg.role === "assistant" && (
                      <div data-actions>
                        {hasError === true ? (
                          onRetry ? (
                            <button
                              aria-label="Retry"
                              onClick={onRetry}
                              type="button"
                            >
                              <RefreshCcwIcon className="size-3" />
                            </button>
                          ) : null
                        ) : null}
                        <button
                          aria-label="Copy"
                          onClick={() =>
                            navigator.clipboard.writeText(part.text)
                          }
                          type="button"
                        >
                          <CopyIcon className="size-3" />
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
                      // biome-ignore lint/nursery/noLeakedRender: wtf
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
              default:
                if (part.type.startsWith("tool-") && "state" in part) {
                  const toolPart = part as ToolUIPart
                  const toolName = toolPart.type.slice(5)
                  return (
                    <Fragment key={`${msg.id}-${idx}`}>
                      {renderTool(toolName, toolPart)}
                    </Fragment>
                  )
                }
                return null
            }
          })}
        </Fragment>
      ))}
    </div>
  )
}

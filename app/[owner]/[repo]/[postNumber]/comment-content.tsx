"use client"

import type { ToolUIPart } from "ai"
import { CopyIcon, RefreshCcwIcon } from "lucide-react"
import { Fragment, type ReactNode } from "react"
import type { AgentToolName, AgentTools } from "@/agent/tools"
import type { AgentUIMessage } from "@/agent/types"
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning"
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput as ToolOutputComponent,
} from "@/components/ai-elements/tool"
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
      <div className="space-y-2 p-4">
        <div className="flex flex-wrap gap-2 text-muted-foreground text-xs">
          <span>{output.metadata.path}</span>
          <span>•</span>
          <span>{output.metadata.fileSize}</span>
          {output.metadata.isPaginated ? (
            <>
              <span>•</span>
              <span>
                Lines {output.metadata.startLine}-{output.metadata.endLine} of{" "}
                {output.metadata.totalLines}
              </span>
            </>
          ) : null}
        </div>
        {/* <pre className="overflow-x-auto rounded-md bg-muted/50 p-3 text-xs">
          <code>{output.content}</code>
        </pre> */}
      </div>
    )
  },
  Grep: (toolPart) => {
    const output = toolPart.output as ToolResult<"Grep"> | undefined
    return (
      <Tool>
        <ToolHeader state={toolPart.state} title="Grep" type={toolPart.type} />
        <ToolContent>
          {output ? (
            <div className="space-y-2 p-4">
              <div className="flex flex-wrap gap-2 text-muted-foreground text-xs">
                <span>Pattern: {output.summary.pattern}</span>
                <span>•</span>
                <span>
                  {output.summary.matchCount} matches in{" "}
                  {output.summary.fileCount} files
                </span>
              </div>
              <pre className="overflow-x-auto rounded-md bg-muted/50 p-3 text-xs">
                <code>{output.matches}</code>
              </pre>
            </div>
          ) : (
            <ToolInput input={toolPart.input} />
          )}
        </ToolContent>
      </Tool>
    )
  },
  List: (toolPart) => {
    const output = toolPart.output as ToolResult<"List"> | undefined
    return (
      <Tool>
        <ToolHeader state={toolPart.state} title="List" type={toolPart.type} />
        <ToolContent>
          {output ? (
            <div className="space-y-2 p-4">
              <div className="flex flex-wrap gap-2 text-muted-foreground text-xs">
                <span>{output.summary.totalFiles} files</span>
                <span>•</span>
                <span>{output.summary.totalDirs} directories</span>
                {output.summary.depth !== undefined ? (
                  <>
                    <span>•</span>
                    <span>Depth: {output.summary.depth}</span>
                  </>
                ) : null}
              </div>
              <pre className="overflow-x-auto rounded-md bg-muted/50 p-3 text-xs">
                <code>{output.listing}</code>
              </pre>
            </div>
          ) : (
            <ToolInput input={toolPart.input} />
          )}
        </ToolContent>
      </Tool>
    )
  },
}

function renderTool(toolName: string, toolPart: ToolUIPart) {
  const renderer = toolRenderers[toolName as AgentToolName]
  if (renderer) {
    return renderer(toolPart)
  }
  return (
    <Tool>
      <ToolHeader
        state={toolPart.state}
        title={toolName}
        type={toolPart.type}
      />
      <ToolContent>
        <ToolInput input={toolPart.input} />
        <ToolOutputComponent
          errorText={toolPart.errorText}
          output={toolPart.output}
        />
      </ToolContent>
    </Tool>
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
  return (
    <div className="space-y-2">
      {content.map((msg) => (
        <Fragment key={msg.id}>
          {msg.parts.map((part, idx) => {
            switch (part.type) {
              case "text": {
                const hasError: boolean =
                  msg.metadata?.errorCode === ERROR_CODES.STREAM_STEP_ERROR
                return (
                  <Message from={msg.role} key={`${msg.id}-${idx}`}>
                    <MessageContent
                      className={
                        // biome-ignore lint/nursery/noLeakedRender: wtf
                        hasError === true
                          ? "text-destructive-foreground"
                          : undefined
                      }
                    >
                      <MessageResponse>{part.text}</MessageResponse>
                    </MessageContent>
                    {msg.role === "assistant" && (
                      <MessageActions>
                        {hasError === true ? (
                          onRetry ? (
                            <MessageAction label="Retry" onClick={onRetry}>
                              <RefreshCcwIcon className="size-3" />
                            </MessageAction>
                          ) : null
                        ) : null}
                        <MessageAction
                          label="Copy"
                          onClick={() =>
                            navigator.clipboard.writeText(part.text)
                          }
                        >
                          <CopyIcon className="size-3" />
                        </MessageAction>
                      </MessageActions>
                    )}
                  </Message>
                )
              }
              case "reasoning":
                return (
                  <Reasoning
                    className="w-full"
                    isStreaming={
                      // biome-ignore lint/nursery/noLeakedRender: sfsaf
                      isStreaming &&
                      idx === msg.parts.length - 1 &&
                      msg.id === content.at(-1)?.id
                    }
                    key={`${msg.id}-${idx}`}
                  >
                    <ReasoningTrigger />
                    <ReasoningContent>{part.text}</ReasoningContent>
                  </Reasoning>
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

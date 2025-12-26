"use client"

import { useChat } from "@ai-sdk/react"
import { WorkflowChatTransport } from "@workflow/ai"
import { useEffect, useMemo, useRef } from "react"
import type { AgentUIMessage } from "@/agent/types"
import { Tool, ToolContent, ToolHeader } from "@/components/ai-elements/tool"
import { CommentContent } from "./comment-content"

export function StreamingContent({ commentId }: { commentId: string }) {
  const started = useRef(false)

  const transport = useMemo(
    () =>
      new WorkflowChatTransport({
        prepareReconnectToStreamRequest: (config) => ({
          ...config,
          api: "/api/stream",
          headers: { "x-comment-id": commentId },
        }),
      }),
    [commentId]
  )

  const { messages, status, resumeStream, regenerate } =
    useChat<AgentUIMessage>({
      id: commentId,
      transport,
    })

  useEffect(() => {
    if (started.current) {
      return
    }
    started.current = true
    resumeStream()
  }, [resumeStream])

  const isStreaming = status === "streaming" || status === "submitted"
  const lastMessage = messages.at(-1)
  const hasContent = lastMessage && lastMessage.parts.length > 0

  return (
    <>
      {!hasContent && (
        <Tool>
          <ToolHeader
            state="input-available"
            title="Workspace"
            type="tool-Workspace"
          />
          <ToolContent>
            <div className="p-4 text-muted-foreground text-xs">
              Setting up workspace...
            </div>
          </ToolContent>
        </Tool>
      )}
      <CommentContent
        content={lastMessage ? [lastMessage] : []}
        isStreaming={isStreaming}
        onRetry={() => regenerate()}
      />
    </>
  )
}

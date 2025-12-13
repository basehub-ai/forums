"use client"

import { useChat } from "@ai-sdk/react"
import { WorkflowChatTransport } from "@workflow/ai"
import { useEffect, useMemo, useRef } from "react"
import type { AgentUIMessage } from "@/agent/types"
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

  const { messages, status, resumeStream } = useChat<AgentUIMessage>({
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

  return (
    <>
      {!!isStreaming && (
        <span className="text-muted-foreground text-xs">typing...</span>
      )}
      <CommentContent
        content={lastMessage ? [lastMessage] : []}
        isStreaming={isStreaming}
      />
    </>
  )
}

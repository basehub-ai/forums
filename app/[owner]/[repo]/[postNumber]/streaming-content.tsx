"use client"

import { useChat } from "@ai-sdk/react"
import { useEffect, useMemo, useRef } from "react"
import type { AgentUIMessage } from "@/agent/types"
import { WorkflowChatTransport } from "@/lib/workflow-ai/workflow-chat-transport"
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

  return (
    <CommentContent
      content={lastMessage ? [lastMessage] : []}
      isStreaming={isStreaming}
      onRetry={() => regenerate()}
    />
  )
}

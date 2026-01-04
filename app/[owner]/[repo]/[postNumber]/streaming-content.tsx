"use client"

import { useChat } from "@ai-sdk/react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useTransition } from "react"
import type { AgentUIMessage } from "@/agent/types"
import { rerunLlmComment } from "@/lib/actions/posts"
import { WorkflowChatTransport } from "@/lib/workflow-ai/workflow-chat-transport"
import { CommentContent } from "./comment-content"

export function StreamingContent({ commentId }: { commentId: string }) {
  const started = useRef(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

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

  function handleRetry() {
    startTransition(async () => {
      await rerunLlmComment({ commentId })
      router.refresh()
    })
  }

  return (
    <CommentContent
      content={lastMessage ? [lastMessage] : []}
      isRetrying={isPending}
      isStreaming={isStreaming}
      onRetry={handleRetry}
    />
  )
}

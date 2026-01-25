"use client"

import { useChat } from "@ai-sdk/react"
import { useRouter } from "next/navigation"
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useTransition,
} from "react"
import type { AgentUIMessage } from "@/agent/types"
import { rerunLlmComment } from "@/lib/actions/posts"
import { WorkflowChatTransport } from "@/lib/workflow-ai/workflow-chat-transport"
import { CommentContent } from "./comment-content"
import { useStreamingState } from "./streaming-state-context"

type StreamingContextValue = {
  isStreaming: boolean
  hasStreamError: boolean
  messages: AgentUIMessage[]
  isRetrying: boolean
  onRetry: () => void
}

const StreamingContext = createContext<StreamingContextValue | null>(null)

export function StreamingCommentProvider({
  commentId,
  children,
}: {
  commentId: string
  children: ReactNode
}) {
  const started = useRef(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { setCommentStreaming } = useStreamingState()

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
  const hasStreamError = status === "error"

  // Sync streaming state with the global context
  useEffect(() => {
    setCommentStreaming(commentId, isStreaming)
    return () => {
      // Clean up when unmounted
      setCommentStreaming(commentId, false)
    }
  }, [commentId, isStreaming, setCommentStreaming])

  function handleRetry() {
    startTransition(async () => {
      await rerunLlmComment({ commentId })
      router.refresh()
    })
  }

  return (
    <StreamingContext.Provider
      value={{
        isStreaming,
        hasStreamError,
        messages,
        isRetrying: isPending,
        onRetry: handleRetry,
      }}
    >
      {children}
    </StreamingContext.Provider>
  )
}

export function StreamingBadge() {
  const ctx = useContext(StreamingContext)

  if (!ctx?.isStreaming) {
    return null
  }

  return (
    <span className="animate-pulse text-muted-foreground text-xs">
      Streaming
    </span>
  )
}

export function StreamingContent() {
  const ctx = useContext(StreamingContext)
  if (!ctx) {
    return null
  }

  const lastMessage = ctx.messages.at(-1)

  return (
    <CommentContent
      content={lastMessage ? [lastMessage] : []}
      hasStreamError={ctx.hasStreamError}
      isRetrying={ctx.isRetrying}
      isStreaming={ctx.isStreaming}
      onRetry={ctx.onRetry}
    />
  )
}

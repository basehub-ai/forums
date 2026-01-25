"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

type StreamingStateContextValue = {
  streamingCommentIds: Set<string>
  hasStreamingComment: boolean
  setCommentStreaming: (commentId: string, isStreaming: boolean) => void
}

const StreamingStateContext = createContext<StreamingStateContextValue | null>(
  null
)

export function StreamingStateProvider({
  initialStreamingCommentIds,
  children,
}: {
  initialStreamingCommentIds: string[]
  children: ReactNode
}) {
  const [streamingCommentIds, setStreamingCommentIds] = useState<Set<string>>(
    () => new Set(initialStreamingCommentIds)
  )

  const setCommentStreaming = useCallback(
    (commentId: string, isStreaming: boolean) => {
      setStreamingCommentIds((prev) => {
        const next = new Set(prev)
        if (isStreaming) {
          next.add(commentId)
        } else {
          next.delete(commentId)
        }
        return next
      })
    },
    []
  )

  const value = useMemo(
    () => ({
      streamingCommentIds,
      hasStreamingComment: streamingCommentIds.size > 0,
      setCommentStreaming,
    }),
    [streamingCommentIds, setCommentStreaming]
  )

  return (
    <StreamingStateContext.Provider value={value}>
      {children}
    </StreamingStateContext.Provider>
  )
}

export function useStreamingState() {
  const ctx = useContext(StreamingStateContext)
  if (!ctx) {
    throw new Error(
      "useStreamingState must be used within a StreamingStateProvider"
    )
  }
  return ctx
}

export function useHasStreamingComment() {
  const ctx = useContext(StreamingStateContext)
  // Return false if context is not available (e.g., in tests or isolated components)
  return ctx?.hasStreamingComment ?? false
}

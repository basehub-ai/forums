"use client"

import type { InferSelectModel } from "drizzle-orm"
import { useEffect, useMemo } from "react"
import type {
  comments as commentsSchema,
  mentions as mentionsSchema,
  reactions as reactionsSchema,
} from "@/lib/db/schema"
import { CommentThread } from "./comment-thread"
import { usePostMetadata } from "./post-metadata-context"

type Comment = InferSelectModel<typeof commentsSchema>
type Mention = InferSelectModel<typeof mentionsSchema>
type Reaction = InferSelectModel<typeof reactionsSchema>

type AuthorInfo = {
  name: string
  username: string
  image: string
  isLlm: boolean
}

export function CommentThreadClient({
  owner,
  repo,
  comments,
  mentions,
  authorsById,
  reactions,
  rootCommentId,
  commentNumbers,
}: {
  owner: string
  repo: string
  comments: Comment[]
  mentions: Mention[]
  authorsById: Record<string, AuthorInfo>
  reactions: Reaction[]
  rootCommentId: string | null
  commentNumbers: Map<string, string>
}) {
  const { selectedRef, gitContext } = usePostMetadata()
  const currentSha = gitContext?.sha ?? null

  // Filter comments based on selected ref (or current HEAD if none selected)
  const filteredComments = useMemo(() => {
    const targetRef = selectedRef ?? currentSha
    return comments.filter((c) => {
      const isLlm = c.authorId.startsWith("llm_")
      if (!isLlm) {
        // Human comments are always shown
        return true
      }
      // Streaming LLM comments are always shown (gitRef not set yet)
      if (c.streamId) {
        return true
      }
      // Completed LLM comments: show if gitRef matches the target ref
      return c.gitRef === targetRef
    })
  }, [comments, selectedRef, currentSha])

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (hash) {
      const el = document.getElementById(hash)
      if (el) {
        el.scrollIntoView({ behavior: "instant", block: "start" })
      }
    }
  }, [])

  return (
    <CommentThread
      authorsById={authorsById}
      commentNumbers={commentNumbers}
      comments={filteredComments}
      mentions={mentions}
      owner={owner}
      reactions={reactions}
      repo={repo}
      rootCommentId={rootCommentId}
    />
  )
}

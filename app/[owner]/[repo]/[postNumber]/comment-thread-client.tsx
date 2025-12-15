"use client"

import type { InferSelectModel } from "drizzle-orm"
import { useEffect, useState } from "react"
import type {
  comments as commentsSchema,
  reactions as reactionsSchema,
} from "@/lib/db/schema"
import { CommentThread } from "./comment-thread"

type Comment = InferSelectModel<typeof commentsSchema>
type Reaction = InferSelectModel<typeof reactionsSchema>

type AuthorInfo = {
  name: string
  username: string
  image: string
  isLlm: boolean
}

type AskingOption = {
  id: string
  name: string
  image?: string | null
  isDefault?: boolean
}

export function CommentThreadClient({
  owner,
  repo,
  comments,
  authorsById,
  reactions,
  rootCommentId,
  commentNumbers,
  askingOptions,
}: {
  owner: string
  repo: string
  comments: Comment[]
  authorsById: Record<string, AuthorInfo>
  reactions: Reaction[]
  rootCommentId: string | null
  commentNumbers: Map<string, string>
  askingOptions: AskingOption[]
}) {
  const [replyingToId, setReplyingToId] = useState<string | null>(null)

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (hash) {
      const el = document.getElementById(hash)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }
  }, [])

  const handleReply = (commentId: string) => {
    setReplyingToId(commentId)
  }

  const handleCancelReply = () => {
    setReplyingToId(null)
  }

  return (
    <CommentThread
      askingOptions={askingOptions}
      authorsById={authorsById}
      commentNumbers={commentNumbers}
      comments={comments}
      onCancelReply={handleCancelReply}
      onReply={handleReply}
      owner={owner}
      reactions={reactions}
      replyingToId={replyingToId}
      repo={repo}
      rootCommentId={rootCommentId}
    />
  )
}

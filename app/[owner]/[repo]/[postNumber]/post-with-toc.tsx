"use client"

import type { InferSelectModel } from "drizzle-orm"
import { useEffect, useMemo, useState } from "react"
import { authClient } from "@/lib/auth-client"
import type {
  comments as commentsSchema,
  mentions as mentionsSchema,
  reactions as reactionsSchema,
} from "@/lib/db/schema"
import { CommentThread, type AuthorInfo } from "./comment-thread"
import { CommentsToc } from "./comments-toc"
import { HeadingsToc } from "./headings-toc"
import { usePostMetadata } from "./post-metadata-context"
import {
  TocProvider,
  useToc,
  useActiveCommentObserver,
  useActiveHeadingObserver,
} from "./toc-context"

type Comment = InferSelectModel<typeof commentsSchema>
type Mention = InferSelectModel<typeof mentionsSchema>
type Reaction = InferSelectModel<typeof reactionsSchema>

type AskingOption = {
  id: string
  name: string
  image?: string | null
  isDefault?: boolean
}

type PostWithTocProps = {
  owner: string
  repo: string
  comments: Comment[]
  mentions: Mention[]
  authorsById: Record<string, AuthorInfo>
  reactions: Reaction[]
  rootCommentId: string | null
  commentNumbers: Map<string, string>
  askingOptions: AskingOption[]
}

function PostWithTocInner({
  owner,
  repo,
  comments,
  mentions,
  authorsById,
  reactions,
  rootCommentId,
  commentNumbers,
  askingOptions,
}: PostWithTocProps) {
  const [replyingToId, setReplyingToId] = useState<string | null>(null)
  const isSignedIn = !!authClient.useSession().data?.session
  const { selectedRef, gitContext } = usePostMetadata()
  const { activeCommentId } = useToc()
  const currentSha = gitContext?.sha ?? null

  const filteredComments = useMemo(() => {
    const targetRef = selectedRef ?? currentSha
    return comments.filter((c) => {
      const isLlm = c.authorId.startsWith("llm_")
      if (!isLlm) return true
      if (c.streamId) return true
      return c.gitRef === targetRef
    })
  }, [comments, selectedRef, currentSha])

  const topLevelComments = useMemo(
    () => filteredComments.filter((c) => c.threadCommentId === null),
    [filteredComments]
  )

  const commentIds = useMemo(
    () =>
      topLevelComments.map((c) => commentNumbers.get(c.id) ?? "").filter(Boolean),
    [topLevelComments, commentNumbers]
  )

  useActiveCommentObserver(commentIds)
  useActiveHeadingObserver(activeCommentId)

  const tocItems = useMemo(
    () =>
      topLevelComments
        .filter((c) => authorsById[c.authorId])
        .map((c) => ({
          id: c.id,
          commentNumber: commentNumbers.get(c.id) ?? "?",
          author: authorsById[c.authorId],
          createdAt: c.createdAt,
          isRoot: c.id === rootCommentId,
        })),
    [topLevelComments, commentNumbers, authorsById, rootCommentId]
  )

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
    <div className="relative">
      <div className="pointer-events-none fixed inset-0 hidden lg:flex lg:justify-center">
        <div className="flex w-full max-w-7xl items-start justify-between px-4">
          <div className="pointer-events-auto sticky top-0 flex h-screen w-44 items-center">
            <CommentsToc items={tocItems} />
          </div>
          <div className="w-[800px] shrink-0" />
          <div className="pointer-events-auto sticky top-0 w-44 pt-20">
            <HeadingsToc />
          </div>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <CommentThread
          askingOptions={askingOptions}
          authorsById={authorsById}
          commentNumbers={commentNumbers}
          comments={filteredComments}
          mentions={mentions}
          onCancelReply={() => {
            if (isSignedIn) setReplyingToId(null)
          }}
          onReply={(commentId) => {
            if (isSignedIn) setReplyingToId(commentId)
          }}
          owner={owner}
          reactions={reactions}
          replyingToId={replyingToId}
          repo={repo}
          rootCommentId={rootCommentId}
        />
      </div>
    </div>
  )
}

export function PostWithToc(props: PostWithTocProps) {
  return (
    <TocProvider>
      <PostWithTocInner {...props} />
    </TocProvider>
  )
}

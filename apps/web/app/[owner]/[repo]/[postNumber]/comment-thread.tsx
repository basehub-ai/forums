import type { InferSelectModel } from "drizzle-orm"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Suspense } from "react"
import type { AgentUIMessage } from "@/agent/types"
import { CopyLinkButton } from "@/components/copy-link-button"
import { CopyMarkdownButton } from "@/components/copy-markdown-button"
import { DeleteCommentButton } from "@/components/delete-comment-button"
import { RelativeTime } from "@/components/relative-time"
import { Tooltip } from "@/components/ui/tooltip"
import { UserAvatar } from "@/components/user-avatar"
import type {
  comments as commentsSchema,
  mentions as mentionsSchema,
  reactions as reactionsSchema,
} from "@/lib/db/schema"
import { CommentContent } from "./comment-content"
import { MentionBanner } from "./mention-banner"
import {
  StreamingBadge,
  StreamingCommentProvider,
  StreamingContent,
} from "./streaming-content"

type Comment = InferSelectModel<typeof commentsSchema>
type Mention = InferSelectModel<typeof mentionsSchema>
type Reaction = InferSelectModel<typeof reactionsSchema>

export type AuthorInfo = {
  name: string
  username: string
  image: string
  isLlm: boolean
}

function CommentItem({
  owner,
  repo,
  comment,
  commentId,
  isRootComment,
  author,
  commentNumber,
}: {
  owner: string
  repo: string
  comment: Comment
  commentId: string
  reactions: Reaction[]
  isRootComment: boolean
  author: AuthorInfo
  commentNumber: string
}) {
  const profileUrl = author.isLlm
    ? `/llm/${author.username}`
    : `/user/${author.username}`

  const { postNumber } = useParams<{ postNumber: string }>()

  const actionLabel = isRootComment ? "posted" : "commented"

  const createdByLabel = comment.createdBy === "mcp" ? "via MCP" : ""

  const header = (
    <div className="sticky top-0 z-10 flex items-center justify-between bg-shade px-2 py-1">
      <div className="flex flex-col sm:flex-row sm:items-center">
        <Link
          className="inline-flex items-center gap-2 font-semibold text-bright text-sm hover:underline"
          href={profileUrl}
        >
          <UserAvatar src={author.image} username={author.username} />

          {author.name}
        </Link>
        <span className="hidden sm:inline">&nbsp;</span>
        <span className="mr-1.5 text-muted-foreground text-sm">
          {actionLabel}{" "}
          <Suspense>
            <RelativeTime
              className="underline decoration-dotted underline-offset-2"
              timestamp={comment.createdAt}
            />
          </Suspense>
          {createdByLabel && !author.isLlm && (
            <span className="text-muted-foreground text-sm">
              {" "}
              <Link
                className="text-muted-foreground text-sm hover:underline"
                href="/install-mcp"
              >
                {createdByLabel}
              </Link>
            </span>
          )}
        </span>
        <CopyLinkButton
          commentNumber={commentNumber}
          owner={owner}
          postNumber={postNumber}
          repo={repo}
        />
      </div>
      <div className="flex items-center">
        {comment.streamStatus === "streaming" && <StreamingBadge />}
        <Tooltip.Provider>
          <DeleteCommentButton
            authorId={comment.authorId}
            commentId={commentId}
            hasLlmResponse={
              comment.seekingAnswerFrom?.startsWith("llm_") ?? false
            }
            isRootComment={isRootComment}
          />
          {comment.streamStatus !== "streaming" && (
            <CopyMarkdownButton content={comment.content as AgentUIMessage[]} />
          )}
        </Tooltip.Provider>
      </div>
    </div>
  )

  const content =
    comment.streamStatus === "streaming" ? (
      <StreamingContent commentNumber={commentNumber} />
    ) : (
      <CommentContent
        commentNumber={commentNumber}
        content={comment.content as AgentUIMessage[]}
      />
    )

  const body = (
    <>
      {header}
      <div className="mt-3">{content}</div>
    </>
  )

  return (
    <div id={commentNumber}>
      <div className="group">
        {comment.streamStatus === "streaming" ? (
          <StreamingCommentProvider commentId={comment.id}>
            {body}
          </StreamingCommentProvider>
        ) : (
          body
        )}
      </div>
    </div>
  )
}

type TimelineItem =
  | { type: "comment"; data: Comment; createdAt: number }
  | { type: "mention"; data: Mention; createdAt: number }

export function CommentThread({
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
  const reactionsByComment: Record<string, Reaction[]> = {}
  for (const reaction of reactions) {
    if (!reactionsByComment[reaction.commentId]) {
      reactionsByComment[reaction.commentId] = []
    }
    reactionsByComment[reaction.commentId].push(reaction)
  }

  const timeline: TimelineItem[] = [
    ...comments.map(
      (c) => ({ type: "comment", data: c, createdAt: c.createdAt }) as const
    ),
    ...mentions.map(
      (m) => ({ type: "mention", data: m, createdAt: m.createdAt }) as const
    ),
  ].sort((a, b) => a.createdAt - b.createdAt)

  return (
    <div className="space-y-16">
      {timeline.map((item) => {
        if (item.type === "mention") {
          const author = authorsById[item.data.authorId]
          return (
            <Suspense key={`mention-${item.data.id}`}>
              <MentionBanner author={author} mention={item.data} />
            </Suspense>
          )
        }

        const comment = item.data
        const author = authorsById[comment.authorId]
        if (!author) {
          return null
        }
        const commentNumber = commentNumbers.get(comment.id) ?? "?"
        const isRootComment = comment.id === rootCommentId
        return (
          <CommentItem
            author={author}
            comment={comment}
            commentId={comment.id}
            commentNumber={commentNumber}
            isRootComment={isRootComment}
            key={comment.id}
            owner={owner}
            reactions={reactionsByComment[comment.id] ?? []}
            repo={repo}
          />
        )
      })}
    </div>
  )
}

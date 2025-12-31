import type { InferSelectModel } from "drizzle-orm"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Suspense } from "react"
import type { AgentUIMessage } from "@/agent/types"
import { CopyLinkButton } from "@/components/copy-link-button"
import type {
  comments as commentsSchema,
  mentions as mentionsSchema,
  reactions as reactionsSchema,
} from "@/lib/db/schema"
import { formatRelativeTime } from "@/lib/utils"
import { CommentContent } from "./comment-content"
import { MentionBanner } from "./mention-banner"
import { PostComposer } from "./post-composer"
import { StreamingContent } from "./streaming-content"

type Comment = InferSelectModel<typeof commentsSchema>
type Mention = InferSelectModel<typeof mentionsSchema>
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

function CommentItem({
  owner,
  repo,
  comment,
  commentId,
  isRootComment,
  author,
  commentNumber,
  depth = 0,
  children,
  hasReplies,
  onReply,
  onCancelReply,
  isReplying,
  askingOptions,
}: {
  owner: string
  repo: string
  comment: Comment
  commentId: string
  reactions: Reaction[]
  isRootComment: boolean
  author: AuthorInfo
  commentNumber: string
  depth?: number
  children?: React.ReactNode
  hasReplies?: boolean
  onReply?: (commentId: string) => void
  onCancelReply?: () => void
  isReplying?: boolean
  askingOptions?: AskingOption[]
}) {
  const profileUrl = author.isLlm
    ? `/llm/${author.username}`
    : `/user/${author.username}`

  const canReply = depth === 0 && !isRootComment && onReply

  const { postNumber } = useParams<{ postNumber: string }>()

  const actionLabel = isRootComment ? "posted" : "commented"

  return (
    <div id={commentNumber}>
      <div className="group">
        <div className="flex items-center gap-2">
          <Link href={profileUrl}>
            <img
              alt={`Avatar of ${author.name}`}
              className="size-6 rounded-full"
              src={author.image}
            />
          </Link>

          <Link
            className="font-semibold text-bright text-sm hover:underline"
            href={profileUrl}
          >
            {author.name}
          </Link>

          <span className="text-muted-foreground text-sm">
            {actionLabel}{" "}
            <span className="underline decoration-dotted underline-offset-2">
              {formatRelativeTime(comment.createdAt)}
            </span>
          </span>

          <Suspense>
            <CopyLinkButton
              commentNumber={commentNumber}
              owner={owner}
              postNumber={postNumber}
              repo={repo}
            />
          </Suspense>
        </div>

        <div className="mt-3">
          {comment.streamId ? (
            <StreamingContent commentId={comment.id} />
          ) : (
            <CommentContent content={comment.content as AgentUIMessage[]} />
          )}
        </div>
      </div>

      {hasReplies && (
        <div className="my-4 flex items-center gap-3 text-faint text-xs">
          <hr className="divider w-6" />
          <span>REPLY IN THREAD</span>
          <hr className="divider flex-1" />
        </div>
      )}

      {children && <div className="border-muted border-l-2 pl-4">{children}</div>}

      {canReply ? (
        isReplying ? (
          askingOptions ? (
            <div className="mt-4 border-muted border-l-2 pl-4">
              <PostComposer
                askingOptions={askingOptions}
                autoFocus
                onCancel={onCancelReply}
                postId={comment.postId}
                storageKey={`reply:${comment.id}`}
                threadCommentId={comment.id}
              />
            </div>
          ) : null
        ) : (
          <div className="mt-4 border-muted border-l-2 pl-4">
            <button
              className="text-muted-foreground text-sm hover:underline"
              onClick={() => onReply(commentId)}
              type="button"
            >
              Reply in thread
            </button>
          </div>
        )
      ) : null}
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
  replyingToId,
  onReply,
  onCancelReply,
  askingOptions,
}: {
  owner: string
  repo: string
  comments: Comment[]
  mentions: Mention[]
  authorsById: Record<string, AuthorInfo>
  reactions: Reaction[]
  rootCommentId: string | null
  commentNumbers: Map<string, string>
  replyingToId?: string | null
  onReply?: (commentId: string) => void
  onCancelReply?: () => void
  askingOptions?: AskingOption[]
}) {
  const reactionsByComment: Record<string, Reaction[]> = {}
  for (const reaction of reactions) {
    if (!reactionsByComment[reaction.commentId]) {
      reactionsByComment[reaction.commentId] = []
    }
    reactionsByComment[reaction.commentId].push(reaction)
  }

  const topLevelComments = comments.filter((c) => c.threadCommentId === null)

  const timeline: TimelineItem[] = [
    ...topLevelComments.map(
      (c) => ({ type: "comment", data: c, createdAt: c.createdAt }) as const
    ),
    ...mentions.map(
      (m) => ({ type: "mention", data: m, createdAt: m.createdAt }) as const
    ),
  ].sort((a, b) => a.createdAt - b.createdAt)

  const repliesByThread = new Map<string, Comment[]>()
  for (const c of comments) {
    if (c.threadCommentId) {
      const existing = repliesByThread.get(c.threadCommentId) ?? []
      existing.push(c)
      repliesByThread.set(c.threadCommentId, existing)
    }
  }

  return (
    <div className="space-y-6">
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
        const replies = repliesByThread.get(comment.id) ?? []
        const hasReplies = replies.length > 0

        return (
          <CommentItem
            askingOptions={askingOptions}
            author={author}
            comment={comment}
            commentId={comment.id}
            commentNumber={commentNumber}
            depth={0}
            hasReplies={hasReplies}
            isReplying={replyingToId === comment.id}
            isRootComment={isRootComment}
            key={comment.id}
            onCancelReply={onCancelReply}
            onReply={onReply}
            owner={owner}
            reactions={reactionsByComment[comment.id] ?? []}
            repo={repo}
          >
            {hasReplies && (
              <div className="space-y-4">
                {replies.map((reply) => {
                  const replyAuthor = authorsById[reply.authorId]
                  if (!replyAuthor) return null
                  const replyNumber = commentNumbers.get(reply.id) ?? "?"
                  return (
                    <CommentItem
                      askingOptions={askingOptions}
                      author={replyAuthor}
                      comment={reply}
                      commentId={reply.id}
                      commentNumber={replyNumber}
                      depth={1}
                      isRootComment={false}
                      key={reply.id}
                      owner={owner}
                      reactions={reactionsByComment[reply.id] ?? []}
                      repo={repo}
                    />
                  )
                })}
              </div>
            )}
          </CommentItem>
        )
      })}
    </div>
  )
}

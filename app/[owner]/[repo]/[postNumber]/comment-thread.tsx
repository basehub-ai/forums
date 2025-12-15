import type { InferSelectModel } from "drizzle-orm"
import Link from "next/link"
import type { AgentUIMessage } from "@/agent/types"
import type {
  comments as commentsSchema,
  reactions as reactionsSchema,
} from "@/lib/db/schema"
import { cn } from "@/lib/utils"
import { CommentContent } from "./comment-content"
import { PostComposer } from "./post-composer"
import { ReactionButtons } from "./reactions"
import { StreamingContent } from "./streaming-content"

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

function CommentItem({
  owner,
  repo,
  comment,
  commentId,
  reactions,
  isRootComment,
  author,
  commentNumber,
  depth = 0,
  children,
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
  onReply?: (commentId: string) => void
  onCancelReply?: () => void
  isReplying?: boolean
  askingOptions?: AskingOption[]
}) {
  const profileUrl = author.isLlm
    ? `/llm/${author.username}`
    : `/user/${author.username}`

  const canReply = depth === 0 && !isRootComment && onReply

  return (
    <div
      className={cn("relative", {
        "ml-6 border-muted border-l-2 pl-4": depth > 0,
      })}
      id={commentNumber}
    >
      <div
        className={cn("border bg-card p-4", {
          "rounded-lg": !canReply,
          "rounded-t-lg": canReply,
        })}
      >
        <div className="mb-2 flex items-center gap-2">
          <Link href={profileUrl}>
            <img
              alt={`Avatar of ${author.name}`}
              className="h-6 w-6 rounded-full"
              src={author.image}
            />
          </Link>
          <Link
            className="font-semibold text-sm hover:underline"
            href={profileUrl}
          >
            {author.name}
          </Link>
          <Link
            className="text-muted-foreground text-xs hover:underline"
            href={`#${commentNumber}`}
          >
            #{commentNumber}
          </Link>
        </div>

        {comment.streamId ? (
          <StreamingContent commentId={comment.id} />
        ) : (
          <CommentContent content={comment.content as AgentUIMessage[]} />
        )}

        <div className="mt-3">
          <ReactionButtons
            commentId={comment.id}
            owner={owner}
            postId={comment.postId}
            reactions={reactions}
            repo={repo}
          />
        </div>
      </div>

      {children}

      {canReply ? (
        isReplying ? (
          askingOptions ? (
            <PostComposer
              askingOptions={askingOptions}
              autoFocus
              connected
              onCancel={onCancelReply}
              postId={comment.postId}
              storageKey={`reply:${comment.id}`}
              threadCommentId={comment.id}
            />
          ) : null
        ) : (
          <button
            className="-mt-px w-full rounded-b-lg border border-t-0 bg-card px-4 py-3 text-left text-muted-foreground text-sm hover:bg-muted/50"
            onClick={() => onReply(commentId)}
            type="button"
          >
            Write a reply...
          </button>
        )
      ) : null}
    </div>
  )
}

function buildCommentTree(
  comments: Comment[],
  threadCommentId: string | null
): Comment[] {
  return comments.filter((c) => c.threadCommentId === threadCommentId)
}

function CommentTreeRecursive({
  owner,
  repo,
  comments,
  threadCommentId,
  reactionsByComment,
  authorsById,
  rootCommentId,
  commentNumbers,
  depth,
  replyingToId,
  onReply,
  onCancelReply,
  askingOptions,
}: {
  owner: string
  repo: string
  comments: Comment[]
  threadCommentId: string | null
  reactionsByComment: Record<string, Reaction[]>
  authorsById: Record<string, AuthorInfo>
  rootCommentId: string | null
  commentNumbers: Map<string, string>
  depth: number
  replyingToId?: string | null
  onReply?: (commentId: string) => void
  onCancelReply?: () => void
  askingOptions?: AskingOption[]
}) {
  const children = buildCommentTree(comments, threadCommentId)

  return (
    <>
      {children.map((comment) => {
        const author = authorsById[comment.authorId]
        if (!author) {
          return null
        }
        const commentNumber = commentNumbers.get(comment.id) ?? "?"
        return (
          <CommentItem
            askingOptions={askingOptions}
            author={author}
            comment={comment}
            commentId={comment.id}
            commentNumber={commentNumber}
            depth={depth}
            isReplying={replyingToId === comment.id}
            isRootComment={comment.id === rootCommentId}
            key={comment.id}
            onCancelReply={onCancelReply}
            onReply={onReply}
            owner={owner}
            reactions={reactionsByComment[comment.id] ?? []}
            repo={repo}
          >
            {depth === 0 ? (
              <CommentTreeRecursive
                askingOptions={askingOptions}
                authorsById={authorsById}
                commentNumbers={commentNumbers}
                comments={comments}
                depth={1}
                onCancelReply={onCancelReply}
                onReply={onReply}
                owner={owner}
                reactionsByComment={reactionsByComment}
                replyingToId={replyingToId}
                repo={repo}
                rootCommentId={rootCommentId}
                threadCommentId={comment.id}
              />
            ) : null}
          </CommentItem>
        )
      })}
    </>
  )
}

export function CommentThread({
  owner,
  repo,
  comments,
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

  return (
    <div className="space-y-4">
      <CommentTreeRecursive
        askingOptions={askingOptions}
        authorsById={authorsById}
        commentNumbers={commentNumbers}
        comments={comments}
        depth={0}
        onCancelReply={onCancelReply}
        onReply={onReply}
        owner={owner}
        reactionsByComment={reactionsByComment}
        replyingToId={replyingToId}
        repo={repo}
        rootCommentId={rootCommentId}
        threadCommentId={null}
      />
    </div>
  )
}

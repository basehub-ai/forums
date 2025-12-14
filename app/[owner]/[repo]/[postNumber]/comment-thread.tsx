import type { InferSelectModel } from "drizzle-orm"
import Link from "next/link"
import type { AgentUIMessage } from "@/agent/types"
import type {
  comments as commentsSchema,
  reactions as reactionsSchema,
} from "@/lib/db/schema"
import { cn } from "@/lib/utils"
import { CommentContent } from "./comment-content"
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

function CommentItem({
  owner,
  repo,
  comment,
  reactions,
  isRootComment,
  author,
  depth = 0,
  children,
}: {
  owner: string
  repo: string
  comment: Comment
  reactions: Reaction[]
  isRootComment: boolean
  author: AuthorInfo
  depth?: number
  children?: React.ReactNode
}) {
  const profileUrl = author.isLlm
    ? `/llm/${author.username}`
    : `/user/${author.username}`

  return (
    <div
      className={cn("relative", {
        "ml-6 border-muted border-l-2 pl-4": depth > 0,
      })}
    >
      <div
        className={cn("rounded-lg", {
          "border bg-card p-4": isRootComment || author.isLlm,
          "py-2": !(isRootComment || author.isLlm),
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
    </div>
  )
}

function buildCommentTree(
  comments: Comment[],
  parentId: string | null
): Comment[] {
  return comments.filter((c) => c.replyToId === parentId)
}

function CommentTreeRecursive({
  owner,
  repo,
  comments,
  parentId,
  reactionsByComment,
  authorsById,
  rootCommentId,
  depth,
}: {
  owner: string
  repo: string
  comments: Comment[]
  parentId: string | null
  reactionsByComment: Record<string, Reaction[]>
  authorsById: Record<string, AuthorInfo>
  rootCommentId: string | null
  depth: number
}) {
  const children = buildCommentTree(comments, parentId)

  return (
    <>
      {children.map((comment) => {
        const author = authorsById[comment.authorId]
        if (!author) {
          return null
        }
        return (
          <CommentItem
            author={author}
            comment={comment}
            depth={depth}
            isRootComment={comment.id === rootCommentId}
            key={comment.id}
            owner={owner}
            reactions={reactionsByComment[comment.id] ?? []}
            repo={repo}
          >
            <CommentTreeRecursive
              authorsById={authorsById}
              comments={comments}
              depth={depth + 1}
              owner={owner}
              parentId={comment.id}
              reactionsByComment={reactionsByComment}
              repo={repo}
              rootCommentId={rootCommentId}
            />
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
}: {
  owner: string
  repo: string
  comments: Comment[]
  authorsById: Record<string, AuthorInfo>
  reactions: Reaction[]
  rootCommentId: string | null
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
        authorsById={authorsById}
        comments={comments}
        depth={0}
        owner={owner}
        parentId={null}
        reactionsByComment={reactionsByComment}
        repo={repo}
        rootCommentId={rootCommentId}
      />
    </div>
  )
}

import type { InferSelectModel } from "drizzle-orm"
import type { AgentUIMessage } from "@/agent/types"
import type {
  comments as commentsSchema,
  llmUsers,
  reactions as reactionsSchema,
} from "@/lib/db/schema"
import { cn } from "@/lib/utils"
import { CommentContent } from "./comment-content"
import { ReactionButtons } from "./reactions"
import { StreamingContent } from "./streaming-content"

type Comment = InferSelectModel<typeof commentsSchema>
type Reaction = InferSelectModel<typeof reactionsSchema>
type LlmUser = InferSelectModel<typeof llmUsers>

function CommentItem({
  owner,
  repo,
  comment,
  llmUsersById,
  reactions,
  isRootComment,
  depth = 0,
  children,
}: {
  owner: string
  repo: string
  comment: Comment
  llmUsersById: Record<string, LlmUser>
  reactions: Reaction[]
  isRootComment: boolean
  depth?: number
  children?: React.ReactNode
}) {
  const isLlm = comment.authorId.startsWith("llm_")
  const llmUser = isLlm ? llmUsersById[comment.authorId] : null
  const authorName = llmUser?.name ?? comment.authorId

  return (
    <div
      className={cn("relative", {
        "ml-6 border-muted border-l-2 pl-4": depth > 0,
      })}
    >
      <div
        className={cn("rounded-lg", {
          "border bg-card p-4": isRootComment || isLlm,
          "py-2": !(isRootComment || isLlm),
        })}
      >
        <div className="mb-2 flex items-center gap-2">
          {!!llmUser?.image && (
            <img
              alt={llmUser.name}
              className="h-6 w-6 rounded-full"
              src={llmUser.image}
            />
          )}
          <span className="font-semibold text-sm">{authorName}</span>
        </div>

        {comment.streamId ? (
          <StreamingContent commentId={comment.id} />
        ) : (
          <CommentContent content={comment.content as AgentUIMessage[]} />
        )}

        {reactions.length > 0 && (
          <div className="mt-3">
            <ReactionButtons
              commentId={comment.id}
              owner={owner}
              postId={comment.postId}
              reactions={reactions}
              repo={repo}
            />
          </div>
        )}
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
  llmUsersById,
  reactionsByComment,
  rootCommentId,
  depth,
}: {
  owner: string
  repo: string
  comments: Comment[]
  parentId: string | null
  llmUsersById: Record<string, LlmUser>
  reactionsByComment: Record<string, Reaction[]>
  rootCommentId: string | null
  depth: number
}) {
  const children = buildCommentTree(comments, parentId)

  return (
    <>
      {children.map((comment) => (
        <CommentItem
          comment={comment}
          depth={depth}
          isRootComment={comment.id === rootCommentId}
          key={comment.id}
          llmUsersById={llmUsersById}
          owner={owner}
          reactions={reactionsByComment[comment.id] ?? []}
          repo={repo}
        >
          <CommentTreeRecursive
            comments={comments}
            depth={depth + 1}
            llmUsersById={llmUsersById}
            owner={owner}
            parentId={comment.id}
            reactionsByComment={reactionsByComment}
            repo={repo}
            rootCommentId={rootCommentId}
          />
        </CommentItem>
      ))}
    </>
  )
}

export function CommentThread({
  owner,
  repo,
  comments,
  llmUsersById,
  reactions,
  rootCommentId,
}: {
  owner: string
  repo: string
  comments: Comment[]
  llmUsersById: Record<string, LlmUser>
  reactions: Reaction[]
  rootCommentId: string | null
  postId: string
  postAuthorId: string
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
        comments={comments}
        depth={0}
        llmUsersById={llmUsersById}
        owner={owner}
        parentId={null}
        reactionsByComment={reactionsByComment}
        repo={repo}
        rootCommentId={rootCommentId}
      />
    </div>
  )
}

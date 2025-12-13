import { and, asc, eq } from "drizzle-orm"
import { ArrowLeftIcon } from "lucide-react"
import { cacheTag } from "next/cache"
import Link from "next/link"
import { notFound } from "next/navigation"
import { db } from "@/lib/db/client"
import {
  categories,
  comments,
  llmUsers,
  posts,
  reactions,
} from "@/lib/db/schema"
import { CommentThread } from "./comment-thread"
import { PostComposer } from "./post-composer"

export const generateStaticParams = async () => {
  const allPosts = await db.select().from(posts)

  return allPosts.map((post) => ({
    owner: post.owner,
    repo: post.repo,
    postNumber: String(post.number),
  }))
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string; postNumber: string }>
}) {
  "use cache"

  const { postNumber: postNumberStr, owner, repo } = await params
  const postNumber = Number.parseInt(postNumberStr, 10)

  if (Number.isNaN(postNumber)) {
    notFound()
  }

  const [[post], allLlmUsers] = await Promise.all([
    db
      .select()
      .from(posts)
      .where(
        and(
          eq(posts.owner, owner),
          eq(posts.repo, repo),
          eq(posts.number, postNumber)
        )
      )
      .limit(1),
    db.select().from(llmUsers).where(eq(llmUsers.isInModelPicker, true)),
  ])

  if (!post) {
    notFound()
  }

  cacheTag(`post:${post.id}`)

  const [postComments, postReactions, category] = await Promise.all([
    db
      .select()
      .from(comments)
      .where(eq(comments.postId, post.id))
      .orderBy(asc(comments.createdAt)),
    db
      .select()
      .from(reactions)
      .where(eq(reactions.commentId, post.rootCommentId ?? "")),
    post.categoryId
      ? db
          .select()
          .from(categories)
          .where(eq(categories.id, post.categoryId))
          .limit(1)
          .then((r) => r[0])
      : null,
  ])

  const llmUsersById = Object.fromEntries(allLlmUsers.map((u) => [u.id, u]))

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="mb-6">
        <Link
          className="flex items-center gap-1 text-muted-foreground text-sm hover:underline"
          href={`/${owner}/${repo}`}
        >
          <ArrowLeftIcon size={14} /> Back to {owner}/{repo}
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-muted-foreground text-sm">#{post.number}</span>
          {!!category && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
              {category.emoji} {category.title}
            </span>
          )}
        </div>
        {!!post.title && <h1 className="font-medium text-3xl">{post.title}</h1>}
      </div>

      <div className="space-y-6">
        <CommentThread
          comments={postComments}
          llmUsersById={llmUsersById}
          postAuthorId={post.authorId}
          postId={post.id}
          reactions={postReactions}
          rootCommentId={post.rootCommentId}
        />
      </div>

      <div className="mt-8">
        <PostComposer
          askingOptions={[
            ...allLlmUsers.map((u) => ({
              id: u.id,
              name: u.name,
              image: u.image,
              isDefault: u.isDefault,
            })),
            { id: "human", name: "Human only" },
          ]}
          postId={post.id}
        />
      </div>
    </div>
  )
}

import { and, asc, eq } from "drizzle-orm"
import { ArrowLeftIcon } from "lucide-react"
import { cacheTag } from "next/cache"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { gitHubUserLoader } from "@/lib/auth"
import { db } from "@/lib/db/client"
import {
  categories,
  comments,
  llmUsers,
  posts,
  reactions,
} from "@/lib/db/schema"
import { getSiteOrigin } from "@/lib/utils"
import { computeCommentNumbers } from "@/lib/utils/comment-numbers"
import { CommentThreadClient } from "./comment-thread-client"
import { PostComposer } from "./post-composer"
import { PostMetadataProvider } from "./post-metadata-context"
import { PostSidebar } from "./post-sidebar"
import { PostTitle } from "./post-title"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ owner: string; repo: string; postNumber: string }>
}): Promise<Metadata> {
  const { owner, repo, postNumber } = await params
  const origin = getSiteOrigin()

  return {
    openGraph: {
      images: [
        `${origin}/api/og/post?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&postNumber=${encodeURIComponent(postNumber)}`,
      ],
    },
  }
}

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

  const [postWithCategory, allLlmUsers, postComments, postReactions] =
    await Promise.all([
      db
        .select({
          id: posts.id,
          number: posts.number,
          owner: posts.owner,
          repo: posts.repo,
          title: posts.title,
          categoryId: posts.categoryId,
          rootCommentId: posts.rootCommentId,
          authorId: posts.authorId,
          createdAt: posts.createdAt,
          updatedAt: posts.updatedAt,
          category: {
            id: categories.id,
            title: categories.title,
            emoji: categories.emoji,
          },
        })
        .from(posts)
        .leftJoin(categories, eq(posts.categoryId, categories.id))
        .where(
          and(
            eq(posts.owner, owner),
            eq(posts.repo, repo),
            eq(posts.number, postNumber)
          )
        )
        .limit(1)
        .then((r) => r[0]),
      db.select().from(llmUsers).where(eq(llmUsers.isInModelPicker, true)),
      db
        .select()
        .from(comments)
        .innerJoin(posts, eq(comments.postId, posts.id))
        .where(
          and(
            eq(posts.owner, owner),
            eq(posts.repo, repo),
            eq(posts.number, postNumber)
          )
        )
        .orderBy(asc(comments.createdAt))
        .then((r) => r.map((row) => row.comments)),
      db
        .select()
        .from(reactions)
        .innerJoin(comments, eq(reactions.commentId, comments.id))
        .innerJoin(posts, eq(comments.postId, posts.id))
        .where(
          and(
            eq(posts.owner, owner),
            eq(posts.repo, repo),
            eq(posts.number, postNumber)
          )
        )
        .then((r) => r.map((row) => row.reactions)),
    ])

  if (!postWithCategory) {
    notFound()
  }

  const { category, ...post } = postWithCategory

  cacheTag(`post:${post.id}`)

  const llmUsersById = Object.fromEntries(allLlmUsers.map((u) => [u.id, u]))

  const humanAuthors: { authorId: string; username: string }[] = []
  const llmAuthorIds = new Set<string>()
  for (const c of postComments) {
    if (c.authorId.startsWith("llm_")) {
      llmAuthorIds.add(c.authorId)
    } else if (c.authorUsername) {
      humanAuthors.push({ authorId: c.authorId, username: c.authorUsername })
    }
  }

  const uniqueHumanUsernames = [...new Set(humanAuthors.map((a) => a.username))]
  const humanUsersByUsername = Object.fromEntries(
    await Promise.all(
      uniqueHumanUsernames.map(async (username) => {
        const user = await gitHubUserLoader.load(username)
        return [username, user] as const
      })
    )
  )

  const authorsById: Record<
    string,
    { name: string; username: string; image: string; isLlm: boolean }
  > = {}

  for (const { authorId, username } of humanAuthors) {
    if (authorsById[authorId]) {
      continue
    }
    const user = humanUsersByUsername[username]
    if (user) {
      authorsById[authorId] = {
        name: user.name,
        username,
        image: user.image,
        isLlm: false,
      }
    }
  }

  for (const llmId of llmAuthorIds) {
    const llm = llmUsersById[llmId]
    if (llm) {
      authorsById[llmId] = {
        name: llm.name,
        username: llm.model,
        image:
          llm.image ??
          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
            llm.name
          )}`,
        isLlm: true,
      }
    }
  }

  const participants = Object.values(authorsById).map((a) => ({
    id: a.username,
    name: a.name,
    image: a.image,
  }))

  const commentNumbers = computeCommentNumbers(postComments)

  const askingOptions = [
    ...allLlmUsers.map((u) => ({
      id: u.id,
      name: u.name,
      image: u.image,
      isDefault: u.isDefault,
    })),
    { id: "human", name: "Human only" },
  ]

  return (
    <PostMetadataProvider
      initialCategory={category?.id ? category : null}
      initialTitle={post.title}
      postId={post.id}
    >
      <div className="mx-auto flex w-full max-w-5xl gap-8 px-4 py-8">
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-col gap-2">
            <Link
              className="flex items-center gap-1 text-muted-foreground text-sm hover:underline"
              href={`/${owner}/${repo}`}
            >
              <ArrowLeftIcon size={14} /> Back to {owner}/{repo}
            </Link>
            <PostTitle />
          </div>

          <div className="space-y-6">
            <CommentThreadClient
              askingOptions={askingOptions}
              authorsById={authorsById}
              commentNumbers={commentNumbers}
              comments={postComments}
              owner={owner}
              reactions={postReactions}
              repo={repo}
              rootCommentId={post.rootCommentId}
            />
          </div>

          <div className="mt-8">
            <PostComposer
              askingOptions={askingOptions}
              postId={post.id}
              storageKey={`composer:${post.id}`}
            />
          </div>
        </div>

        <PostSidebar participants={participants} />
      </div>
    </PostMetadataProvider>
  )
}

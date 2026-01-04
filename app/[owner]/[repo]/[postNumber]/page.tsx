import { and, asc, eq } from "drizzle-orm"
import type { Metadata } from "next"
import { cacheLife, cacheTag } from "next/cache"
import { notFound } from "next/navigation"
import { z } from "zod"
import { Container } from "@/components/container"
import { gitHubUserLoader } from "@/lib/auth"
import { getPostByNumber, getRootCommentText } from "@/lib/data/posts"
import { db } from "@/lib/db/client"
import {
  categories,
  comments,
  llmUsers,
  mentions,
  posts,
  reactions,
} from "@/lib/db/schema"
import { getSiteOrigin } from "@/lib/utils"
import { computeCommentNumbers } from "@/lib/utils/comment-numbers"
import { CommentThreadClient } from "./comment-thread-client"
import { PostComposer } from "./post-composer"
import { PostHeader } from "./post-header"
import { PostMetadataProvider } from "./post-metadata-context"

const githubCompareSchema = z.object({
  ahead_by: z.number(),
  behind_by: z.number(),
  status: z.enum(["ahead", "behind", "identical", "diverged"]),
})

async function getStaleInfo(
  owner: string,
  repo: string,
  baseSha: string,
  branch: string
) {
  "use cache"
  cacheLife("minutes")

  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/compare/${baseSha}...${branch}`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          ...(process.env.GITHUB_TOKEN && {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          }),
        },
      }
    )

    if (!res.ok) {
      return null
    }

    const data = githubCompareSchema.parse(await res.json())
    if (data.ahead_by === 0) {
      return null
    }

    return { commitsAhead: data.ahead_by }
  } catch {
    return null
  }
}

const DESCRIPTION_MAX_LENGTH = 160

export async function generateMetadata({
  params,
}: {
  params: Promise<{ owner: string; repo: string; postNumber: string }>
}): Promise<Metadata> {
  const { owner, repo, postNumber } = await params
  const origin = getSiteOrigin()
  const postNumberInt = Number.parseInt(postNumber, 10)

  if (Number.isNaN(postNumberInt)) {
    return {}
  }

  const post = await getPostByNumber(owner, repo, postNumberInt)
  if (!post) {
    return {}
  }

  const title = `${post.title} — ${owner}/${repo}`

  let description = ""
  if (post.rootCommentId) {
    const text = await getRootCommentText(post.rootCommentId)
    if (text) {
      description =
        text.length > DESCRIPTION_MAX_LENGTH
          ? `${text.slice(0, DESCRIPTION_MAX_LENGTH)}…`
          : text
    }
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
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

  const [
    postWithCategory,
    allLlmUsers,
    postComments,
    postReactions,
    postMentions,
    repoCategories,
  ] = await Promise.all([
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
        gitContexts: posts.gitContexts,
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
    db
      .select()
      .from(mentions)
      .innerJoin(posts, eq(mentions.targetPostId, posts.id))
      .where(
        and(
          eq(posts.owner, owner),
          eq(posts.repo, repo),
          eq(posts.number, postNumber)
        )
      )
      .orderBy(asc(mentions.createdAt))
      .then((r) => r.map((row) => row.mentions)),
    db
      .select({
        id: categories.id,
        title: categories.title,
        emoji: categories.emoji,
      })
      .from(categories)
      .where(and(eq(categories.owner, owner), eq(categories.repo, repo))),
  ])

  if (!postWithCategory) {
    notFound()
  }

  const { category, gitContexts, ...post } = postWithCategory
  const gitContext = gitContexts?.[0] ?? null

  cacheTag(`post:${post.id}`)

  const staleInfo = gitContext
    ? await getStaleInfo(owner, repo, gitContext.sha, gitContext.branch)
    : null

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
  for (const m of postMentions) {
    if (m.authorUsername) {
      humanAuthors.push({ authorId: m.authorId, username: m.authorUsername })
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

  const commentNumbers = computeCommentNumbers(postComments)

  // Archived refs are all git contexts except the current HEAD
  const archivedRefs = (gitContexts?.slice(1) ?? []).map((g) => g.sha)

  const askingOptions = [
    ...allLlmUsers.map((u) => ({
      id: u.id,
      name: u.name,
      image: u.image,
      isDefault: u.isDefault,
    })),
    { id: "human", name: "Human only" },
  ]

  // Find the last LLM that commented on this post
  const lastLlmAuthorId = [...postComments]
    .reverse()
    .find((c) => c.authorId.startsWith("llm_"))?.authorId

  return (
    <PostMetadataProvider
      archivedRefs={archivedRefs}
      authorId={post.authorId}
      categories={repoCategories}
      initialCategory={category?.id ? category : null}
      initialGitContext={gitContext}
      initialTitle={post.title}
      owner={owner}
      postId={post.id}
      repo={repo}
      staleInfo={staleInfo}
    >
      <Container>
        <div className="min-h-body-min-height">
          <PostHeader owner={owner} postNumber={postNumber} repo={repo} />

          <div className="mt-8 space-y-4">
            <CommentThreadClient
              askingOptions={askingOptions}
              authorsById={authorsById}
              commentNumbers={commentNumbers}
              comments={postComments}
              mentions={postMentions}
              owner={owner}
              reactions={postReactions}
              repo={repo}
              rootCommentId={post.rootCommentId}
            />
          </div>
        </div>

        <hr className="divider-md my-14 h-px border-0" />
        <p className="relative -top-14 left-1/2 max-w-max -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-sm">
          END OF POST
        </p>

        <PostComposer
          askingOptions={askingOptions}
          defaultLlmId={lastLlmAuthorId}
          postId={post.id}
        />
      </Container>
    </PostMetadataProvider>
  )
}

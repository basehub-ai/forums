"use server"

import { waitUntil } from "@vercel/functions"
import { and, eq, sql } from "drizzle-orm"
import { updateTag } from "next/cache"
import { headers } from "next/headers"
import { start } from "workflow/api"
import { runCategoryAgent } from "@/agent/category-agent"
import { responseAgent } from "@/agent/response-agent"
import type { AgentUIMessage } from "@/agent/types"
import { auth, extractGitHubUserId, gitHubUserByIdLoader } from "@/lib/auth"
import { db } from "@/lib/db/client"
import {
  categories,
  comments,
  llmUsers,
  mentions,
  postCounters,
  posts,
  reactions,
} from "@/lib/db/schema"
import { resolvePostLinks } from "@/lib/post-links"
import { extractPostLinks } from "@/lib/post-links-parser"
import { indexComment, indexPost, updatePostIndex } from "@/lib/typesense-index"
import { getSiteOrigin, nanoid } from "@/lib/utils"
import { run } from "../run"

export async function createMentions({
  sourcePostId,
  sourceCommentId,
  authorId,
  authorUsername,
  content,
  owner,
  repo,
}: {
  sourcePostId: string
  sourceCommentId: string
  authorId: string
  authorUsername: string | null
  content: AgentUIMessage
  owner: string
  repo: string
}) {
  const parsedLinks = extractPostLinks(content)
  if (parsedLinks.length === 0) {
    return
  }

  const resolved = await resolvePostLinks(parsedLinks, owner, repo)
  const now = Date.now()

  const sourcePost = await db
    .select({
      number: posts.number,
      title: posts.title,
    })
    .from(posts)
    .where(eq(posts.id, sourcePostId))
    .limit(1)
    .then((r) => r[0])

  if (!sourcePost) {
    return
  }

  for (const { postId: targetPostId } of resolved.values()) {
    if (targetPostId === sourcePostId) {
      continue
    }

    const existing = await db
      .select({ id: mentions.id })
      .from(mentions)
      .where(
        and(
          eq(mentions.targetPostId, targetPostId),
          eq(mentions.sourceCommentId, sourceCommentId)
        )
      )
      .limit(1)

    if (existing.length > 0) {
      continue
    }

    await db.insert(mentions).values({
      id: nanoid(),
      targetPostId,
      sourcePostId,
      sourceCommentId,
      sourcePostNumber: sourcePost.number,
      sourcePostTitle: sourcePost.title,
      sourcePostOwner: owner,
      sourcePostRepo: repo,
      authorId,
      authorUsername,
      createdAt: now,
    })

    const targetPost = await db
      .select({ owner: posts.owner, repo: posts.repo })
      .from(posts)
      .where(eq(posts.id, targetPostId))
      .limit(1)
      .then((r) => r[0])
    if (targetPost) {
      await fetch(`${getSiteOrigin()}/api/revalidate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: process.env.REVALIDATE_SECRET,
          paths: [],
          tags: [
            `repo:${targetPost.owner}:${targetPost.repo}`,
            `post:${targetPostId}`,
          ],
        }),
      })
    }
  }
}

async function getSessionOrThrow() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }
  return session
}

async function getGitHubUsername(
  image: string | null | undefined
): Promise<string | null> {
  const userId = extractGitHubUserId(image)
  if (!userId) {
    return null
  }
  const user = await gitHubUserByIdLoader.load(userId)
  return user?.login ?? null
}

export async function createPost(data: {
  owner: string
  repo: string
  content: AgentUIMessage
  seekingAnswerFrom?: string | null
}) {
  const session = await getSessionOrThrow()
  const authorUsername = await getGitHubUsername(session.user.image)
  const now = Date.now()
  const postId = nanoid()
  const commentId = nanoid()

  const [llm, newPost] = await Promise.all([
    run(
      async () => {
        if (data.seekingAnswerFrom === "human") {
          return null
        }
        if (data.seekingAnswerFrom?.startsWith("llm_")) {
          return await db
            .select()
            .from(llmUsers)
            .where(eq(llmUsers.id, data.seekingAnswerFrom))
            .limit(1)
            .then((r) => r[0] ?? null)
        }
        return await db
          .select()
          .from(llmUsers)
          .where(eq(llmUsers.isDefault, true))
          .limit(1)
          .then((r) => r[0] ?? null)
      },
      { noCatch: true }
    ),
    db
      .insert(postCounters)
      .values({ owner: data.owner, repo: data.repo, lastNumber: 1 })
      .onConflictDoUpdate({
        target: [postCounters.owner, postCounters.repo],
        set: { lastNumber: sql`${postCounters.lastNumber} + 1` },
      })
      .returning({ lastNumber: postCounters.lastNumber })
      .then(async (r) => {
        return await db
          .insert(posts)
          .values({
            id: postId,
            number: r[0].lastNumber,
            owner: data.owner,
            repo: data.repo,
            authorId: session.user.id,
            rootCommentId: commentId,
            createdAt: now,
            updatedAt: now,
          })
          .returning()
          .then((p) => p[0])
      }),
    db.insert(comments).values({
      id: commentId,
      postId,
      authorId: session.user.id,
      authorUsername,
      content: [data.content],
      seekingAnswerFrom: data.seekingAnswerFrom,
      createdAt: now,
      updatedAt: now,
    }),
  ])

  let llmCommentId: string | undefined
  let streamId: string | undefined

  if (llm) {
    const newCommentId = nanoid()
    llmCommentId = nanoid()
    streamId = String(now)

    await Promise.all([
      db.insert(comments).values({
        id: newCommentId,
        postId,
        authorId: llm.id,
        authorUsername: llm.model,
        content: [],
        streamId,
        createdAt: now + 1,
        updatedAt: now + 1,
      }),
      start(responseAgent, [
        {
          commentId: newCommentId,
          streamId,
          postId,
          owner: data.owner,
          repo: data.repo,
          model: llm.model,
        },
      ]).then(({ runId }) =>
        db.update(comments).set({ runId }).where(eq(comments.id, newCommentId))
      ),
    ])
  }

  const contentText = data.content.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n\n")

  // Index post first so category agent can update it
  await indexPost(newPost, 1)

  if (contentText) {
    await runCategoryAgent({
      postId,
      owner: data.owner,
      repo: data.repo,
      content: contentText,
    })
  }

  waitUntil(
    (async () => {
      const [comment] = await db
        .select()
        .from(comments)
        .where(eq(comments.id, commentId))
        .limit(1)
      if (comment) {
        await indexComment(comment, data.owner, data.repo, true)
      }
    })()
  )

  waitUntil(
    createMentions({
      sourcePostId: postId,
      sourceCommentId: commentId,
      authorId: session.user.id,
      authorUsername,
      content: data.content,
      owner: data.owner,
      repo: data.repo,
    })
  )

  updateTag(`repo:${data.owner}:${data.repo}`)
  updateTag(`post:${postId}`)

  return {
    postId,
    postNumber: newPost.number,
    commentId,
    ...(llmCommentId && { llmCommentId }),
    ...(streamId && { streamId }),
  }
}

export async function createComment(data: {
  postId: string
  content: AgentUIMessage
  threadCommentId?: string
  seekingAnswerFrom?: string | null
}) {
  const session = await getSessionOrThrow()
  const authorUsername = await getGitHubUsername(session.user.image)
  const now = Date.now()
  const commentId = nanoid()

  const [post, llm] = await Promise.all([
    db
      .select()
      .from(posts)
      .where(eq(posts.id, data.postId))
      .limit(1)
      .then((r) => r[0]),
    run(
      async () => {
        if (data.seekingAnswerFrom === "human") {
          return null
        }
        if (data.seekingAnswerFrom?.startsWith("llm_")) {
          return await db
            .select()
            .from(llmUsers)
            .where(eq(llmUsers.id, data.seekingAnswerFrom))
            .limit(1)
            .then((r) => r[0] ?? null)
        }
        return await db
          .select()
          .from(llmUsers)
          .where(eq(llmUsers.isDefault, true))
          .limit(1)
          .then((r) => r[0] ?? null)
      },
      { noCatch: true }
    ),
  ])

  if (!post) {
    throw new Error("Post not found")
  }

  const isOp = session.user.id === post.authorId
  const isTopLevel = !data.threadCommentId
  // LLM replies to same thread as user (flat), or creates new thread if user is OP posting top-level
  const llmThreadCommentId =
    llm && !(isTopLevel && isOp)
      ? (data.threadCommentId ?? commentId)
      : undefined

  let llmCommentId: string | undefined
  let streamId: string | undefined

  const promises: Promise<unknown>[] = [
    db.insert(comments).values({
      id: commentId,
      postId: data.postId,
      threadCommentId: data.threadCommentId,
      authorId: session.user.id,
      authorUsername,
      content: [data.content],
      seekingAnswerFrom: data.seekingAnswerFrom,
      createdAt: now,
      updatedAt: now,
    }),
  ]

  if (llm) {
    const newCommentId = nanoid()
    llmCommentId = newCommentId
    streamId = String(now)

    promises.push(
      db.insert(comments).values({
        id: newCommentId,
        postId: data.postId,
        threadCommentId: llmThreadCommentId,
        authorId: llm.id,
        authorUsername: llm.model,
        content: [],
        streamId,
        createdAt: now + 1,
        updatedAt: now + 1,
      }),
      start(responseAgent, [
        {
          commentId: newCommentId,
          streamId,
          postId: data.postId,
          owner: post.owner,
          repo: post.repo,
          model: llm.model,
        },
      ]).then(({ runId }) =>
        db.update(comments).set({ runId }).where(eq(comments.id, newCommentId))
      )
    )
  }

  await Promise.all(promises)

  waitUntil(
    (async () => {
      const [comment] = await db
        .select()
        .from(comments)
        .where(eq(comments.id, commentId))
        .limit(1)
      if (comment) {
        await indexComment(comment, post.owner, post.repo, false)
      }
      const commentCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(comments)
        .where(eq(comments.postId, data.postId))
        .then((r) => Number(r[0]?.count ?? 0))
      await updatePostIndex(data.postId, { commentCount })
    })()
  )

  waitUntil(
    createMentions({
      sourcePostId: data.postId,
      sourceCommentId: commentId,
      authorId: session.user.id,
      authorUsername,
      content: data.content,
      owner: post.owner,
      repo: post.repo,
    })
  )

  updateTag(`repo:${post.owner}:${post.repo}`)
  updateTag(`post:${post.id}`)

  return {
    commentId,
    ...(llmCommentId && { llmCommentId }),
    ...(streamId && { streamId }),
  }
}

export async function addReaction({
  owner,
  repo,
  postId,
  commentId,
  type,
}: {
  owner: string
  repo: string
  postId: string
  commentId: string
  type: string
}) {
  const session = await getSessionOrThrow()
  await db
    .insert(reactions)
    .values({
      id: nanoid(),
      userId: session.user.id,
      commentId,
      type,
      createdAt: Date.now(),
    })
    .onConflictDoNothing()
  updateTag(`repo:${owner}:${repo}`)
  updateTag(`post:${postId}`)
}

export async function removeReaction({
  owner,
  repo,
  postId,
  commentId,
  type,
}: {
  owner: string
  repo: string
  postId: string
  commentId: string
  type: string
}) {
  const session = await getSessionOrThrow()
  await db
    .delete(reactions)
    .where(
      and(
        eq(reactions.userId, session.user.id),
        eq(reactions.commentId, commentId),
        eq(reactions.type, type)
      )
    )
  updateTag(`repo:${owner}:${repo}`)
  updateTag(`post:${postId}`)
}

export async function getPostMetadata(postId: string) {
  const [post] = await db
    .select({
      title: posts.title,
      categoryId: posts.categoryId,
      owner: posts.owner,
      repo: posts.repo,
    })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1)

  if (!post) {
    throw new Error("Post not found")
  }

  if (typeof post.title !== "string") {
    return null
  }

  updateTag(`repo:${post.owner}:${post.repo}`)
  updateTag(`post:${postId}`)

  return {
    title: post.title,
    category: post.categoryId
      ? await db
          .select({
            id: categories.id,
            title: categories.title,
            emoji: categories.emoji,
          })
          .from(categories)
          .where(eq(categories.id, post.categoryId))
          .limit(1)
          .then((c) => c[0] ?? null)
      : null,
  }
}

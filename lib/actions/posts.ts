"use server"

import { waitUntil } from "@vercel/functions"
import { and, eq, sql } from "drizzle-orm"
import { updateTag } from "next/cache"
import { headers } from "next/headers"
import { start } from "workflow/api"
import { runCategoryAgent } from "@/agent/category-agent"
import { responseAgent } from "@/agent/response-agent"
import type { AgentUIMessage } from "@/agent/types"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db/client"
import {
  comments,
  llmUsers,
  postCounters,
  posts,
  reactions,
} from "@/lib/db/schema"
import { indexComment, indexPost, updatePostIndex } from "@/lib/typesense-index"
import { nanoid } from "@/lib/utils"
import { run } from "../run"

async function getSessionOrThrow() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }
  return session
}

export async function createPost(data: {
  owner: string
  repo: string
  content: AgentUIMessage
  seekingAnswerFrom?: string | null
}) {
  const session = await getSessionOrThrow()
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

  if (contentText) {
    waitUntil(
      runCategoryAgent({
        postId,
        owner: data.owner,
        repo: data.repo,
        content: contentText,
      })
    )
  }

  waitUntil(
    (async () => {
      const [post] = await db
        .select()
        .from(posts)
        .where(eq(posts.id, postId))
        .limit(1)
      if (post) {
        await indexPost(post, 1)
        const [comment] = await db
          .select()
          .from(comments)
          .where(eq(comments.id, commentId))
          .limit(1)
        if (comment) {
          await indexComment(comment, data.owner, data.repo, true)
        }
      }
    })()
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
  replyToId?: string
  seekingAnswerFrom?: string | null
}) {
  const session = await getSessionOrThrow()
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
  const isTopLevel = !data.replyToId
  const llmReplyToId = llm && !(isTopLevel && isOp) ? commentId : undefined

  let llmCommentId: string | undefined
  let streamId: string | undefined

  const promises: Promise<unknown>[] = [
    db.insert(comments).values({
      id: commentId,
      postId: data.postId,
      replyToId: data.replyToId,
      authorId: session.user.id,
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
        replyToId: llmReplyToId,
        authorId: llm.id,
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

"use server"
import { waitUntil } from "@vercel/functions"
import { and, asc, eq, inArray, or, sql } from "drizzle-orm"
import { updateTag } from "next/cache"
import { headers } from "next/headers"
import slugify from "slugify"
import { getRun, start } from "workflow/api"
import { runCategoryAgent } from "@/agent/category-agent"
import { responseAgent } from "@/agent/response-agent"
import type { AgentUIMessage } from "@/agent/types"
import {
  auth,
  extractGitHubUserId,
  gitHubUserByIdLoader,
  isAdmin,
} from "@/lib/auth"
import { autumn, type BillingCategory, CREDIT_COSTS } from "@/lib/autumn"
import { canModerate } from "@/lib/data/permissions"
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
import { parsePostUrl } from "@/lib/parse-post-url"
import { resolvePostLinks } from "@/lib/post-links"
import { extractPostLinks } from "@/lib/post-links-parser"
import { checkMessageRateLimit, checkReactionRateLimit } from "@/lib/rate-limit"
import {
  deleteCommentFromIndex,
  deletePostFromIndex,
  indexComment,
  indexPost,
  indexRepo,
  updatePostIndex,
} from "@/lib/typesense-index"
import { getSiteOrigin, nanoid } from "@/lib/utils"
import { run } from "../run"

function categorySlugify(title: string) {
  return slugify(title, { lower: true, strict: true })
}

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
  categoryId?: string
}) {
  const session = await getSessionOrThrow()
  await checkMessageRateLimit(session.user.id)
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
            categoryId: data.categoryId,
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
    const billingCategory = (llm.billing_category ||
      "standard") as BillingCategory

    const { data: checkResult, error } = await autumn.check({
      customer_id: session.user.id,
      feature_id: "standard_credits",
      required_balance: CREDIT_COSTS[billingCategory],
    })

    if (error || !checkResult) {
      throw new Error("Failed to check billing status. Please try again.")
    }

    if (!checkResult.allowed) {
      throw new Error("Insufficient credits. Please upgrade your plan.")
    }

    const newCommentId = nanoid()
    llmCommentId = nanoid()
    streamId = String(now)

    const { runId } = await start(responseAgent, [
      {
        commentId: newCommentId,
        streamId,
        postId,
        owner: data.owner,
        repo: data.repo,
        model: llm.model,
        userId: session.user.id,
        billingCategory,
      },
    ])

    await db.insert(comments).values({
      id: newCommentId,
      postId,
      authorId: llm.id,
      authorUsername: llm.model,
      content: [],
      streamId,
      streamStatus: "streaming",
      runId,
      createdAt: now + 1,
      updatedAt: now + 1,
    })
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
      existingCategoryId: data.categoryId,
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
        await indexComment(
          comment,
          data.owner,
          data.repo,
          newPost.number,
          newPost.categoryId,
          true
        )
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

  waitUntil(indexRepo(data.owner, data.repo))

  updateTag(`repo:${data.owner}:${data.repo}`)
  updateTag(`post:${postId}`)
  if (authorUsername) {
    updateTag(`user:${authorUsername}`)
  }

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
  await checkMessageRateLimit(session.user.id)
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

  await db.insert(comments).values({
    id: commentId,
    postId: data.postId,
    threadCommentId: data.threadCommentId,
    authorId: session.user.id,
    authorUsername,
    content: [data.content],
    seekingAnswerFrom: data.seekingAnswerFrom,
    createdAt: now,
    updatedAt: now,
  })

  if (llm) {
    const billingCategory = (llm.billing_category ||
      "standard") as BillingCategory

    const { data: checkResult, error } = await autumn.check({
      customer_id: session.user.id,
      feature_id: "standard_credits",
      required_balance: CREDIT_COSTS[billingCategory],
    })

    if (error || !checkResult) {
      throw new Error("Failed to check billing status. Please try again.")
    }

    if (!checkResult.allowed) {
      throw new Error("Insufficient credits. Please upgrade your plan.")
    }

    const newCommentId = nanoid()
    llmCommentId = newCommentId
    streamId = String(now)

    const { runId } = await start(responseAgent, [
      {
        commentId: newCommentId,
        streamId,
        postId: data.postId,
        owner: post.owner,
        repo: post.repo,
        model: llm.model,
        userId: session.user.id,
        billingCategory,
      },
    ])

    await db.insert(comments).values({
      id: newCommentId,
      postId: data.postId,
      threadCommentId: llmThreadCommentId,
      authorId: llm.id,
      authorUsername: llm.model,
      content: [],
      streamId,
      streamStatus: "streaming",
      runId,
      createdAt: now + 1,
      updatedAt: now + 1,
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
        await indexComment(
          comment,
          post.owner,
          post.repo,
          post.number,
          post.categoryId,
          false
        )
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
  if (authorUsername) {
    updateTag(`user:${authorUsername}`)
  }

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
  await checkReactionRateLimit(session.user.id)
  const authorUsername = await getGitHubUsername(session.user.image)
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
  if (authorUsername) {
    updateTag(`user:${authorUsername}`)
  }
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
  await checkReactionRateLimit(session.user.id)
  const authorUsername = await getGitHubUsername(session.user.image)
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
  if (authorUsername) {
    updateTag(`user:${authorUsername}`)
  }
}

export async function getPostMetadata(postId: string) {
  const [post] = await db
    .select({
      title: posts.title,
      categoryId: posts.categoryId,
      gitContexts: posts.gitContexts,
      owner: posts.owner,
      repo: posts.repo,
    })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1)

  if (!post) {
    throw new Error("Post not found")
  }

  const gitContext = post.gitContexts?.[0]
  if (typeof post.title !== "string" || !gitContext) {
    return null
  }

  updateTag(`repo:${post.owner}:${post.repo}`)
  updateTag(`post:${postId}`)

  return {
    title: post.title,
    gitContext,
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

export async function getCategories(owner: string, repo: string) {
  return await db
    .select({
      id: categories.id,
      title: categories.title,
      emoji: categories.emoji,
    })
    .from(categories)
    .where(and(eq(categories.owner, owner), eq(categories.repo, repo)))
}

export async function updatePost(data: {
  postId: string
  title?: string
  categoryId?: string | null
}) {
  const session = await getSessionOrThrow()

  const [post] = await db
    .select({
      id: posts.id,
      owner: posts.owner,
      repo: posts.repo,
      authorId: posts.authorId,
      categoryId: posts.categoryId,
    })
    .from(posts)
    .where(eq(posts.id, data.postId))
    .limit(1)

  if (!post) {
    throw new Error("Post not found")
  }

  if (post.authorId !== session.user.id) {
    throw new Error("Unauthorized: only the post author can edit this post")
  }

  const updates: {
    title?: string
    categoryId?: string | null
    updatedAt: number
  } = {
    updatedAt: Date.now(),
  }

  if (data.title !== undefined) {
    updates.title = data.title
  }

  if (data.categoryId !== undefined) {
    if (data.categoryId !== null) {
      const [category] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(
          and(
            eq(categories.id, data.categoryId),
            eq(categories.owner, post.owner),
            eq(categories.repo, post.repo)
          )
        )
        .limit(1)

      if (!category) {
        throw new Error("Category not found")
      }
    }
    updates.categoryId = data.categoryId
  }

  await db.update(posts).set(updates).where(eq(posts.id, data.postId))

  const indexUpdates: { title?: string; categoryId?: string } = {}
  if (data.title !== undefined) {
    indexUpdates.title = data.title
  }
  if (data.categoryId !== undefined) {
    indexUpdates.categoryId = data.categoryId ?? ""
  }
  if (Object.keys(indexUpdates).length > 0) {
    await updatePostIndex(data.postId, indexUpdates)
  }

  updateTag(`repo:${post.owner}:${post.repo}`)
  updateTag(`post:${data.postId}`)

  const categoryIdsToInvalidate = new Set<string>()
  if (post.categoryId) {
    categoryIdsToInvalidate.add(post.categoryId)
  }
  if (data.categoryId && data.categoryId !== post.categoryId) {
    categoryIdsToInvalidate.add(data.categoryId)
  }
  if (categoryIdsToInvalidate.size > 0) {
    const categoriesToInvalidate = await db
      .select({ id: categories.id, title: categories.title })
      .from(categories)
      .where(sql`${categories.id} IN ${[...categoryIdsToInvalidate]}`)
    for (const cat of categoriesToInvalidate) {
      updateTag(`category:${categorySlugify(cat.title)}`)
    }
  }

  return { success: true }
}

async function startLlmCommentRerun({
  oldComment,
  post,
  llm,
  now,
  streamId,
  userId,
  billingCategory,
}: {
  oldComment: {
    postId: string
    threadCommentId: string | null
    createdAt: number
  }
  post: { owner: string; repo: string }
  llm: { id: string; model: string; billing_category: string }
  now: number
  streamId: string
  userId: string
  billingCategory: BillingCategory
}): Promise<string> {
  const newCommentId = nanoid()

  await db.insert(comments).values({
    id: newCommentId,
    postId: oldComment.postId,
    threadCommentId: oldComment.threadCommentId,
    authorId: llm.id,
    authorUsername: llm.model,
    content: [],
    streamId,
    streamStatus: "streaming",
    createdAt: oldComment.createdAt,
    updatedAt: now,
  })

  const { runId } = await start(responseAgent, [
    {
      commentId: newCommentId,
      streamId,
      postId: oldComment.postId,
      owner: post.owner,
      repo: post.repo,
      model: llm.model,
      userId,
      billingCategory,
    },
  ])

  await db.update(comments).set({ runId }).where(eq(comments.id, newCommentId))

  return newCommentId
}

export async function rerunLlmComment(data: {
  commentId: string
}): Promise<{ commentId: string }> {
  const session = await getSessionOrThrow()
  await checkMessageRateLimit(session.user.id)
  const now = Date.now()

  const oldComment = await db
    .select()
    .from(comments)
    .where(eq(comments.id, data.commentId))
    .limit(1)
    .then((r) => r[0])

  if (!oldComment) {
    throw new Error("Comment not found")
  }

  if (!oldComment.authorId.startsWith("llm_")) {
    throw new Error("Can only re-run LLM comments")
  }

  const [post, llm, existingStream] = await Promise.all([
    db
      .select()
      .from(posts)
      .where(eq(posts.id, oldComment.postId))
      .limit(1)
      .then((r) => r[0]),
    db
      .select()
      .from(llmUsers)
      .where(eq(llmUsers.id, oldComment.authorId))
      .limit(1)
      .then((r) => r[0]),
    db
      .select({ id: comments.id })
      .from(comments)
      .where(
        and(
          eq(comments.postId, oldComment.postId),
          eq(comments.streamStatus, "streaming")
        )
      )
      .limit(1)
      .then((r) => r[0]),
  ])

  if (!post) {
    throw new Error("Post not found")
  }

  if (!llm) {
    throw new Error("LLM user not found")
  }

  if (existingStream) {
    throw new Error("A response is already being generated")
  }

  const billingCategory = (llm.billing_category ||
    "standard") as BillingCategory

  const { data: checkResult, error } = await autumn.check({
    customer_id: session.user.id,
    feature_id: "standard_credits",
    required_balance: CREDIT_COSTS[billingCategory],
  })

  if (error || !checkResult) {
    throw new Error("Failed to check billing status. Please try again.")
  }

  if (!checkResult.allowed) {
    throw new Error("Insufficient credits. Please upgrade your plan.")
  }

  // Delete the old comment (we're replacing it with a new one at the same position)
  await db.delete(comments).where(eq(comments.id, data.commentId))

  const newCommentId = await startLlmCommentRerun({
    oldComment,
    post,
    llm,
    now,
    streamId: String(now),
    userId: session.user.id,
    billingCategory,
  })

  updateTag(`repo:${post.owner}:${post.repo}`)
  updateTag(`post:${oldComment.postId}`)

  return { commentId: newCommentId }
}

export async function rerunLlmCommentsInPost(data: {
  postId: string
  updateGitContext?: boolean
}): Promise<{ commentId: string }> {
  const session = await getSessionOrThrow()
  await checkMessageRateLimit(session.user.id)
  const now = Date.now()

  const [post, defaultLlm, existingStream] = await Promise.all([
    db
      .select()
      .from(posts)
      .where(eq(posts.id, data.postId))
      .limit(1)
      .then((r) => r[0]),
    db
      .select()
      .from(llmUsers)
      .where(eq(llmUsers.isDefault, true))
      .limit(1)
      .then((r) => r[0]),
    db
      .select({ id: comments.id })
      .from(comments)
      .where(
        and(
          eq(comments.postId, data.postId),
          eq(comments.streamStatus, "streaming")
        )
      )
      .limit(1)
      .then((r) => r[0]),
  ])

  if (!post) {
    throw new Error("Post not found")
  }

  const isAuthor = post.authorId === session.user.id
  const isModerator = await canModerate(session.user.id, post.owner, post.repo)
  if (!(isAuthor || isModerator)) {
    throw new Error(
      "Unauthorized: only the post author or moderators can re-run responses"
    )
  }

  if (!defaultLlm) {
    throw new Error("No default LLM user found")
  }

  if (existingStream) {
    throw new Error("A response is already being generated")
  }

  // Get current HEAD sha to find which LLM comments to re-run
  const currentSha = post.gitContexts?.[0]?.sha

  // Get LLM comments at the current HEAD (the ones we'll re-run)
  const llmComments = await db
    .select()
    .from(comments)
    .where(
      and(
        eq(comments.postId, data.postId),
        sql`${comments.authorId} LIKE 'llm_%'`,
        currentSha ? eq(comments.gitRef, currentSha) : sql`TRUE`
      )
    )
    .orderBy(asc(comments.createdAt))

  if (llmComments.length === 0) {
    throw new Error("No LLM comments to re-run")
  }

  // Check credits for all comments (worst case: pro cost per comment)
  const requiredCredits = llmComments.length * CREDIT_COSTS.pro

  const { data: checkResult } = await autumn.check({
    customer_id: session.user.id,
    feature_id: "standard_credits",
    required_balance: requiredCredits,
  })

  if (!checkResult?.allowed) {
    throw new Error("Insufficient credits. Please upgrade your plan.")
  }

  // Delete old LLM comments at current SHA (they'll be replaced)
  await db
    .delete(comments)
    .where(
      and(
        eq(comments.postId, data.postId),
        sql`${comments.authorId} LIKE 'llm_%'`,
        currentSha ? eq(comments.gitRef, currentSha) : sql`TRUE`
      )
    )

  if (data.updateGitContext) {
    // Clear gitContexts so setupStep fetches fresh and creates new array
    await db
      .update(posts)
      .set({ gitContexts: null, updatedAt: now })
      .where(eq(posts.id, data.postId))
  }

  let lastCommentId = ""

  for (const [index, oldComment] of llmComments.entries()) {
    const llm = await db
      .select()
      .from(llmUsers)
      .where(eq(llmUsers.id, oldComment.authorId))
      .limit(1)
      .then((r) => r[0] ?? defaultLlm)

    const commentBillingCategory = (llm.billing_category ||
      "standard") as BillingCategory

    lastCommentId = await startLlmCommentRerun({
      oldComment,
      post,
      llm,
      now,
      streamId: String(now + index),
      userId: session.user.id,
      billingCategory: commentBillingCategory,
    })
  }

  updateTag(`repo:${post.owner}:${post.repo}`)
  updateTag(`post:${data.postId}`)

  return { commentId: lastCommentId }
}

export async function deletePostByUrl(url: string) {
  const parsed = parsePostUrl(url)
  if (!parsed) {
    throw new Error("Invalid URL format. Expected: /owner/repo/postNumber")
  }

  const { owner, repo, postNumber } = parsed

  const [post] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(
      and(
        eq(posts.owner, owner),
        eq(posts.repo, repo),
        eq(posts.number, postNumber)
      )
    )
    .limit(1)

  if (!post) {
    throw new Error(`Post not found: ${owner}/${repo}#${postNumber}`)
  }

  await deletePost(post.id)

  return { success: true, deleted: `${owner}/${repo}#${postNumber}` }
}

export async function deletePost(postId: string) {
  const session = await getSessionOrThrow()

  const [post] = await db
    .select({
      id: posts.id,
      owner: posts.owner,
      repo: posts.repo,
      authorId: posts.authorId,
    })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1)

  if (!post) {
    throw new Error("Post not found")
  }

  const userIsAdmin = isAdmin(session.user)
  if (post.authorId !== session.user.id && !userIsAdmin) {
    throw new Error(
      "Unauthorized: only the post author or admin can delete this post"
    )
  }

  const postComments = await db
    .select({
      id: comments.id,
      runId: comments.runId,
      streamStatus: comments.streamStatus,
    })
    .from(comments)
    .where(eq(comments.postId, postId))

  // Cancel any streaming workflows before deleting
  for (const comment of postComments) {
    if (comment.streamStatus === "streaming" && comment.runId) {
      try {
        await getRun(comment.runId).cancel()
      } catch {
        // Ignore errors if workflow already completed or not found
      }
    }
  }

  const commentIds = postComments.map((c) => c.id)

  if (commentIds.length > 0) {
    await db.delete(reactions).where(inArray(reactions.commentId, commentIds))
    await db.delete(comments).where(inArray(comments.id, commentIds))
  }

  await db
    .delete(mentions)
    .where(
      or(eq(mentions.targetPostId, postId), eq(mentions.sourcePostId, postId))
    )

  await deletePostFromIndex(postId)

  await db.delete(posts).where(eq(posts.id, postId))

  await indexRepo(post.owner, post.repo)

  updateTag(`repo:${post.owner}:${post.repo}`)
  updateTag(`post:${postId}`)

  return { success: true }
}

export async function deleteComment(commentId: string) {
  const session = await getSessionOrThrow()

  const [comment] = await db
    .select({
      id: comments.id,
      postId: comments.postId,
      authorId: comments.authorId,
      seekingAnswerFrom: comments.seekingAnswerFrom,
      createdAt: comments.createdAt,
      threadCommentId: comments.threadCommentId,
    })
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1)

  if (!comment) {
    throw new Error("Comment not found")
  }

  const userIsAdmin = isAdmin(session.user)
  if (comment.authorId !== session.user.id && !userIsAdmin) {
    throw new Error(
      "Unauthorized: only the comment author or admin can delete this comment"
    )
  }

  const [post] = await db
    .select({
      id: posts.id,
      owner: posts.owner,
      repo: posts.repo,
      rootCommentId: posts.rootCommentId,
    })
    .from(posts)
    .where(eq(posts.id, comment.postId))
    .limit(1)

  if (!post) {
    throw new Error("Post not found")
  }

  // If this is the root comment, delete the entire post
  if (comment.id === post.rootCommentId) {
    await deletePost(post.id)
    return { success: true, deletedPost: true }
  }

  const commentsToDelete = [comment.id]

  // If comment was seeking answer from an LLM, find and delete the LLM response
  if (comment.seekingAnswerFrom?.startsWith("llm_")) {
    const [llmResponse] = await db
      .select({
        id: comments.id,
        runId: comments.runId,
        streamStatus: comments.streamStatus,
      })
      .from(comments)
      .where(
        and(
          eq(comments.postId, comment.postId),
          eq(comments.authorId, comment.seekingAnswerFrom),
          sql`${comments.createdAt} > ${comment.createdAt}`
        )
      )
      .orderBy(asc(comments.createdAt))
      .limit(1)

    if (llmResponse) {
      // Cancel the workflow if it's still streaming
      if (llmResponse.streamStatus === "streaming" && llmResponse.runId) {
        try {
          await getRun(llmResponse.runId).cancel()
        } catch {
          // Ignore errors if workflow already completed or not found
        }
      }
      commentsToDelete.push(llmResponse.id)
    }
  }

  // Delete reactions for all comments being deleted
  await db
    .delete(reactions)
    .where(inArray(reactions.commentId, commentsToDelete))

  // Delete mentions where these comments are the source
  await db
    .delete(mentions)
    .where(inArray(mentions.sourceCommentId, commentsToDelete))

  // Delete the comments
  await db.delete(comments).where(inArray(comments.id, commentsToDelete))

  // Delete from search index
  for (const id of commentsToDelete) {
    await deleteCommentFromIndex(id)
  }

  // Update comment count in post index
  const commentCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(comments)
    .where(eq(comments.postId, post.id))
    .then((r) => Number(r[0]?.count ?? 0))
  await updatePostIndex(post.id, { commentCount })

  updateTag(`repo:${post.owner}:${post.repo}`)
  updateTag(`post:${post.id}`)

  return { success: true, deletedPost: false }
}

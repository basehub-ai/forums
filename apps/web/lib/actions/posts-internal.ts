import { waitUntil } from "@vercel/functions"
import { eq, sql } from "drizzle-orm"
import { revalidateTag, updateTag } from "next/cache"
import { start } from "workflow/api"
import { runCategoryAgent } from "@/agent/category-agent"
import { responseAgent } from "@/agent/response-agent"
import type { AgentMode, AgentUIMessage } from "@/agent/types"
import { extractGitHubUserId, gitHubUserByIdLoader } from "@/lib/auth"
import { autumn, type BillingCategory, CREDIT_COSTS } from "@/lib/autumn"
import { canModerate } from "@/lib/data/permissions"
import { db } from "@/lib/db/client"
import { comments, llmUsers, postCounters, posts } from "@/lib/db/schema"
import { indexComment, indexPost, indexRepo } from "@/lib/typesense-index"
import { nanoid } from "@/lib/utils"
import { run } from "../run"
import { createMentions } from "./posts"

function invalidateTag(tag: string, createdBy: "web" | "mcp" = "web") {
  if (createdBy === "mcp") {
    revalidateTag(tag, "max")
  } else {
    updateTag(tag)
  }
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

export async function createPostCore(data: {
  owner: string
  repo: string
  content: AgentUIMessage
  seekingAnswerFrom?: string | null
  categoryId?: string
  branch?: string
  mode?: AgentMode
  userId: string
  userImage?: string | null
  userEmail?: string | null
  userName?: string | null
  userAccessToken?: string | null
  createdBy?: "web" | "mcp"
}) {
  const mode = data.mode ?? "ask"

  if (mode === "build") {
    const hasPermission = await canModerate(data.userId, data.owner, data.repo)
    if (!hasPermission) {
      throw new Error("Build mode requires write access to this repository")
    }
    if (!data.userAccessToken) {
      throw new Error("Could not retrieve GitHub access token for build mode")
    }
    if (!(data.userEmail && data.userName)) {
      throw new Error(
        "Build mode requires email and name from your GitHub profile"
      )
    }
  }

  const authorUsername = await getGitHubUsername(data.userImage)
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
            authorId: data.userId,
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
      authorId: data.userId,
      authorUsername,
      content: [data.content],
      seekingAnswerFrom: data.seekingAnswerFrom,
      createdBy: data.createdBy ?? "web",
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
      customer_id: data.userId,
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
        postId,
        owner: data.owner,
        repo: data.repo,
        model: llm.model,
        userId: data.userId,
        billingCategory,
        branch: data.branch,
        mode,
        userAccessToken: data.userAccessToken,
        userEmail: data.userEmail,
        userName: data.userName,
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
      createdBy: data.createdBy ?? "web",
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
      mode,
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
      authorId: data.userId,
      authorUsername,
      content: data.content,
      owner: data.owner,
      repo: data.repo,
    })
  )

  waitUntil(indexRepo(data.owner, data.repo))

  const createdBy = data.createdBy ?? "web"
  invalidateTag(`repo:${data.owner}:${data.repo}`, createdBy)
  invalidateTag(`post:${postId}`, createdBy)
  if (authorUsername) {
    invalidateTag(`user:${authorUsername}`, createdBy)
  }

  return {
    postId,
    postNumber: newPost.number,
    commentId,
    ...(llmCommentId && { llmCommentId }),
    ...(streamId && { streamId }),
  }
}

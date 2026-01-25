import { asc, eq, sql } from "drizzle-orm"
import { revalidateTag } from "next/cache"
import { headers } from "next/headers"
import { after } from "next/server"
import type { InferSchema } from "xmcp"
import { z } from "zod"
import { runCategoryAgent } from "@/agent/category-agent"
import { mcpAgent } from "@/agent/mcp-agent"
import type { AgentUIMessage } from "@/agent/types"
import { auth, extractGitHubUserId, gitHubUserByIdLoader } from "@/lib/auth"
import { autumn, CREDIT_COSTS, checkIsPro } from "@/lib/autumn"
import { db } from "@/lib/db/client"
import { comments, llmUsers, postCounters, posts, user } from "@/lib/db/schema"
import { checkMessageRateLimit } from "@/lib/rate-limit"
import { resolveRepoInput } from "@/lib/resolve-repo-input"
import {
  indexComment,
  indexPost,
  indexRepo,
  updatePostIndex,
} from "@/lib/typesense-index"
import { getSiteOrigin, nanoid } from "@/lib/utils"

export const schema = {
  repo: z
    .string()
    .describe(
      "Repository URL, owner/repo, or npm package name (e.g., 'https://github.com/vercel/next.js', 'vercel/next.js', or 'next')"
    ),
  query: z.string().describe("Your question about the repository"),
  ref: z
    .string()
    .optional()
    .describe(
      "Git ref (branch, tag, commit). Defaults to version tag for npm packages"
    ),
  postId: z
    .string()
    .optional()
    .describe("Post ID to continue an existing conversation"),
}

export const metadata = {
  name: "ask",
  description:
    "Ask a question about any public repository's source code. Use when you need to understand how an external library, framework, or dependency works. Especially for implementation details, edge cases, or behavior not covered in docs.",
  annotations: {
    title: "Ask about repository",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false,
  },
}

async function getGitHubUsername(
  image: string | null | undefined
): Promise<string | null> {
  const userId = extractGitHubUserId(image)
  if (!userId) {
    return null
  }
  const githubUser = await gitHubUserByIdLoader.load(userId)
  return githubUser?.login ?? null
}

export default async function ask({
  repo: repoInput,
  query,
  ref,
  postId: existingPostId,
}: InferSchema<typeof schema>): Promise<{
  content: { type: "text"; text: string }[]
  structuredContent: { response: string; postId: string; postUrl: string }
}> {
  const session = await auth.api.getMcpSession({ headers: await headers() })

  // Get authenticated session
  if (!session) {
    throw new Error("Authentication required. Please reconnect with OAuth.")
  }

  const userId = session.userId

  // Rate limit check
  await checkMessageRateLimit(userId)

  // Resolve repo input (GitHub URL, owner/repo, or npm package)
  let owner: string
  let repo: string
  let defaultRef: string | undefined

  try {
    const resolved = await resolveRepoInput({ input: repoInput })
    owner = resolved.owner
    repo = resolved.repo
    defaultRef = resolved.defaultRef
  } catch (err) {
    throw err instanceof Error
      ? err
      : new Error(
          "Invalid repository. Use GitHub URL (https://github.com/owner/repo), owner/repo format, or npm package name."
        )
  }

  // Use provided ref or default from npm package
  const gitRef = ref ?? defaultRef

  const [llmUser, userRecord] = await Promise.all([
    db
      .select({ id: llmUsers.id, model: llmUsers.model })
      .from(llmUsers)
      .where(eq(llmUsers.isDefault, true))
      .limit(1)
      .then((r) => r[0]),
    db
      .select({ id: user.id, username: user.username, image: user.image })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)
      .then((r) => r[0]),
  ])

  if (!llmUser) {
    throw new Error("No default LLM user configured")
  }

  if (!userRecord) {
    throw new Error("User account not found for MCP session")
  }

  const authorUsername =
    userRecord.username ?? (await getGitHubUsername(userRecord.image))
  const seekingAnswerFrom = llmUser.id
  const llmUserModel = llmUser.model

  // Check credits
  const isPro = await checkIsPro(userId)
  const { data: checkResult, error: checkError } = await autumn.check({
    customer_id: userId,
    feature_id: "standard_credits",
    required_balance: CREDIT_COSTS.standard,
  })

  if (checkError || !checkResult) {
    throw new Error("Failed to check billing status. Please try again.")
  }

  if (!checkResult.allowed) {
    if (isPro) {
      throw new Error(
        "You've used all your Pro credits this month. Credits reset at the start of your billing cycle."
      )
    }
    throw new Error(
      "You've used all 5 daily credits. Wait until tomorrow or upgrade to Pro for 1500 monthly credits at forums.basehub.com/pricing"
    )
  }

  const now = Date.now()

  // Create user message
  const userMessage: AgentUIMessage = {
    id: nanoid(),
    role: "user",
    parts: [{ type: "text", text: query }],
  }

  // Wrap all database operations in a transaction
  // If mcpAgent fails, the transaction rolls back automatically
  const result = await db.transaction(async (tx) => {
    let postId: string
    let postNumber: number
    let isNewPost = false
    let userCommentId: string
    let categoryId: string | null = null

    if (existingPostId) {
      // Continue existing conversation
      const existingPost = await tx
        .select({
          id: posts.id,
          number: posts.number,
          owner: posts.owner,
          repo: posts.repo,
          categoryId: posts.categoryId,
        })
        .from(posts)
        .where(eq(posts.id, existingPostId))
        .limit(1)
        .then((r) => r[0])

      if (!existingPost) {
        throw new Error(`Post '${existingPostId}' not found.`)
      }

      if (existingPost.owner !== owner || existingPost.repo !== repo) {
        throw new Error(
          `Post '${existingPostId}' belongs to a different repository.`
        )
      }

      postId = existingPost.id
      postNumber = existingPost.number
      categoryId = existingPost.categoryId
      userCommentId = nanoid()

      // Add user comment to existing post
      await tx.insert(comments).values({
        id: userCommentId,
        postId,
        authorId: userId,
        authorUsername,
        seekingAnswerFrom,
        createdBy: "mcp",
        content: [userMessage],
        createdAt: now,
        updatedAt: now,
      })
    } else {
      // Create new post
      isNewPost = true
      postId = nanoid()
      userCommentId = nanoid()

      const counterResult = await tx
        .insert(postCounters)
        .values({ owner, repo, lastNumber: 1 })
        .onConflictDoUpdate({
          target: [postCounters.owner, postCounters.repo],
          set: { lastNumber: sql`${postCounters.lastNumber} + 1` },
        })
        .returning({ lastNumber: postCounters.lastNumber })

      postNumber = counterResult[0].lastNumber

      await Promise.all([
        tx.insert(posts).values({
          id: postId,
          number: postNumber,
          owner,
          repo,
          authorId: userId,
          rootCommentId: userCommentId,
          createdAt: now,
          updatedAt: now,
        }),
        tx.insert(comments).values({
          id: userCommentId,
          postId,
          authorId: userId,
          authorUsername,
          seekingAnswerFrom,
          createdBy: "mcp",
          content: [userMessage],
          createdAt: now,
          updatedAt: now,
        }),
      ])
    }

    // Get all previous messages for context
    const allComments = await tx
      .select({ content: comments.content })
      .from(comments)
      .where(eq(comments.postId, postId))
      .orderBy(asc(comments.createdAt))

    const messages: AgentUIMessage[] = allComments.flatMap((c) => c.content)

    // Run the agent - if this throws, the transaction rolls back
    const { response, gitRef: resolvedGitRef } = await mcpAgent({
      owner,
      repo,
      ref: gitRef,
      messages,
      model: llmUserModel,
      userId,
    })

    // Create LLM response comment
    const llmCommentId = nanoid()
    const llmMessage: AgentUIMessage = {
      id: nanoid(),
      role: "assistant",
      parts: [{ type: "text", text: response }],
    }

    await tx.insert(comments).values({
      id: llmCommentId,
      postId,
      authorId: llmUser.id,
      authorUsername: llmUserModel,
      createdBy: "mcp",
      content: [llmMessage],
      streamStatus: "completed",
      gitRef: resolvedGitRef,
      createdAt: now + 1,
      updatedAt: now + 1,
    })

    // Update post git context if not already set
    const postWithContext = await tx
      .select({ gitContexts: posts.gitContexts })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1)
      .then((r) => r[0])

    if (!postWithContext?.gitContexts) {
      await tx
        .update(posts)
        .set({
          gitContexts: [
            {
              sha: resolvedGitRef,
              branch: gitRef ?? "HEAD",
              tags: [],
              message: "",
              date: new Date().toISOString(),
            },
          ],
          updatedAt: now,
        })
        .where(eq(posts.id, postId))
    }

    return {
      postId,
      postNumber,
      response,
      isNewPost,
      userCommentId,
      llmCommentId,
      categoryId,
      resolvedGitRef,
    }
  })

  const postUrl = `${getSiteOrigin()}/${owner}/${repo}/${result.postNumber}`

  // Index post first (required before category agent can update it)
  if (result.isNewPost) {
    await indexPost(
      {
        id: result.postId,
        number: result.postNumber,
        owner,
        repo,
        title: null,
        categoryId: null,
        authorId: userId,
        rootCommentId: result.userCommentId,
        gitContexts: null,
        pinned: false,
        visibility: "public",
        createdAt: now,
        updatedAt: now,
      },
      2 // user comment + llm comment
    )
  }

  revalidateTag(`repo:${owner}:${repo}`, "max")
  revalidateTag(`post:${result.postId}`, "max")

  const response = {
    content: [{ type: "text", text: result.response }],
    structuredContent: {
      response: result.response,
      postId: result.postId,
      postUrl,
    },
  }

  // Background tasks: index comments, update counts, run category agent
  after(async () => {
    try {
      // Fetch the comments we just created for indexing
      const [userComment, llmComment] = await Promise.all([
        db
          .select()
          .from(comments)
          .where(eq(comments.id, result.userCommentId))
          .limit(1)
          .then((r) => r[0]),
        db
          .select()
          .from(comments)
          .where(eq(comments.id, result.llmCommentId))
          .limit(1)
          .then((r) => r[0]),
      ])

      // Index comments
      const indexPromises: Promise<void>[] = []
      if (userComment) {
        indexPromises.push(
          indexComment(
            userComment,
            owner,
            repo,
            result.postNumber,
            result.categoryId,
            result.isNewPost, // isRootComment only for new posts
            { visibility: "public" }
          )
        )
      }
      if (llmComment) {
        indexPromises.push(
          indexComment(
            llmComment,
            owner,
            repo,
            result.postNumber,
            result.categoryId,
            false,
            { visibility: "public" }
          )
        )
      }

      // Update comment count for existing posts
      if (!result.isNewPost) {
        const commentCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(comments)
          .where(eq(comments.postId, result.postId))
          .then((r) => Number(r[0]?.count ?? 0))
        indexPromises.push(updatePostIndex(result.postId, { commentCount }))
      }

      // Index repo stats
      indexPromises.push(indexRepo(owner, repo))

      await Promise.all(indexPromises)

      // Run category agent for new posts (generates title)
      if (result.isNewPost) {
        await runCategoryAgent({
          postId: result.postId,
          owner,
          repo,
          content: query,
        })
      }
    } catch (error) {
      console.error("Failed to run post-creation tasks:", error)
    }
  })

  return response as {
    content: { type: "text"; text: string }[]
    structuredContent: { response: string; postId: string; postUrl: string }
  }
}

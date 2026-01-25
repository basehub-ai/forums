import { eq } from "drizzle-orm"
import { revalidateTag } from "next/cache"
import { headers } from "next/headers"
import { after } from "next/server"
import type { InferSchema } from "xmcp"
import { z } from "zod"
import type { AgentUIMessage } from "@/agent/types"
import { auth } from "@/lib/auth"
import { autumn, CREDIT_COSTS, checkIsPro } from "@/lib/autumn"
import { getUserAccessToken } from "@/lib/data/github"
import { db } from "@/lib/db/client"
import { comments, llmUsers, user } from "@/lib/db/schema"
import { checkMessageRateLimit } from "@/lib/rate-limit"
import { resolveRepoInput } from "@/lib/resolve-repo-input"
import { indexRepo } from "@/lib/typesense-index"
import { getSiteOrigin, nanoid } from "@/lib/utils"
import { createPostCore } from "@/lib/actions/posts-internal"

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
  model: z
    .string()
    .optional()
    .describe(
      "Model ID to use. Run list_models tool to see available options."
    ),
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

export default async function ask({
  repo: repoInput,
  query,
  ref,
  model,
}: InferSchema<typeof schema>): Promise<{
  content: { type: "text"; text: string }[]
  structuredContent: { response: string; postId: string; postUrl: string }
}> {
  const session = await auth.api.getMcpSession({ headers: await headers() })

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
    const resolved = await resolveRepoInput(repoInput)
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

  // Get user record, pro status, and all models in parallel
  const [userRecord, isPro, allModels] = await Promise.all([
    db
      .select({
        id: user.id,
        username: user.username,
        image: user.image,
        email: user.email,
        name: user.name,
        lastLlmUserId: user.lastLlmUserId,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)
      .then((r) => r[0]),
    checkIsPro(userId),
    db.select().from(llmUsers).where(eq(llmUsers.isInModelPicker, true)),
  ])

  if (!userRecord) {
    throw new Error("User account not found for MCP session")
  }

  // Filter models by pro status
  const availableModels = isPro
    ? allModels
    : allModels.filter((m) => m.billing_category === "standard")

  // Select the model to use
  let llmUser: (typeof availableModels)[0]
  if (model) {
    const found = availableModels.find(
      (m) => m.id === model || m.name.toLowerCase() === model.toLowerCase()
    )
    if (!found) {
      throw new Error(
        `Model '${model}' not available. ${isPro ? "Run list_models to see available options." : "Upgrade to Pro for more models."}`
      )
    }
    llmUser = found
  } else if (userRecord.lastLlmUserId) {
    const lastUsed = availableModels.find(
      (m) => m.id === userRecord.lastLlmUserId
    )
    llmUser = lastUsed ?? availableModels.find((m) => m.isDefault)!
  } else {
    llmUser = availableModels.find((m) => m.isDefault)!
  }

  if (!llmUser) {
    throw new Error("No default LLM user configured")
  }

  // Check credits
  const billingCategory = llmUser.billing_category || "standard"
  const { data: checkResult, error: checkError } = await autumn.check({
    customer_id: userId,
    feature_id: "standard_credits",
    required_balance: CREDIT_COSTS[billingCategory as keyof typeof CREDIT_COSTS],
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

  // Get user access token for workspace
  const userAccessToken = await getUserAccessToken(userId)

  // Create user message
  const userMessage: AgentUIMessage = {
    id: nanoid(),
    role: "user",
    parts: [{ type: "text", text: query }],
  }

  // Create post using createPostCore (same code path as web UI)
  const result = await createPostCore({
    owner,
    repo,
    content: userMessage,
    seekingAnswerFrom: llmUser.id,
    branch: gitRef,
    userId,
    userImage: userRecord.image,
    userEmail: userRecord.email,
    userName: userRecord.name,
    userAccessToken,
    createdBy: "mcp",
  })

  // Poll until the LLM response is complete
  if (result.llmCommentId) {
    const maxWaitMs = 5 * 60 * 1000 // 5 minutes
    const pollIntervalMs = 500
    const startTime = Date.now()

    while (Date.now() - startTime < maxWaitMs) {
      const comment = await db
        .select({ streamStatus: comments.streamStatus })
        .from(comments)
        .where(eq(comments.id, result.llmCommentId))
        .limit(1)
        .then((r) => r[0])

      if (
        comment?.streamStatus === "completed" ||
        comment?.streamStatus === "failed"
      ) {
        break
      }

      await new Promise((r) => setTimeout(r, pollIntervalMs))
    }
  }

  // Get final response from DB
  const finalComment = result.llmCommentId
    ? await db
        .select({ content: comments.content, gitRef: comments.gitRef })
        .from(comments)
        .where(eq(comments.id, result.llmCommentId))
        .limit(1)
        .then((r) => r[0])
    : null

  // Extract text response from the comment content
  let responseText = "I was unable to generate a response."
  if (finalComment?.content) {
    const textParts = finalComment.content
      .flatMap((msg) => msg.parts)
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
    if (textParts.length > 0) {
      responseText = textParts.join("\n\n")
    }
  }

  const postUrl = `${getSiteOrigin()}/${owner}/${repo}/${result.postNumber}`

  revalidateTag(`repo:${owner}:${repo}`, "max")
  revalidateTag(`post:${result.postId}`, "max")

  // Background tasks
  after(async () => {
    try {
      // Update user's last used LLM preference
      await db
        .update(user)
        .set({ lastLlmUserId: llmUser.id })
        .where(eq(user.id, userId))

      // Index repo stats
      await indexRepo(owner, repo)
    } catch (error) {
      console.error("Failed to run post-creation tasks:", error)
    }
  })

  return {
    content: [{ type: "text", text: responseText }],
    structuredContent: {
      response: responseText,
      postId: result.postId,
      postUrl,
    },
  }
}

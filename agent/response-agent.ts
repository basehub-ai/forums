import { track } from "@vercel/analytics/server"
import {
  convertToModelMessages,
  type FinishReason,
  streamText,
  type UIMessage,
} from "ai"
import { and, asc, eq, lt } from "drizzle-orm"
import { nanoid } from "nanoid"
import { revalidateTag } from "next/cache"
import { getWritable } from "workflow"
import { z } from "zod"
import { createMentions } from "@/lib/actions/posts"
import { autumn, type BillingCategory, CREDIT_COSTS } from "@/lib/autumn"
import { db } from "@/lib/db/client"
import { comments, posts } from "@/lib/db/schema"
import { ERROR_CODES } from "@/lib/errors"
import { getAllTools, getTools } from "./tools"
import type { AgentMode, AgentUIMessage } from "./types"
import { getWorkspace } from "./workspace"

export async function responseAgent({
  commentId,
  streamId,
  postId,
  owner,
  repo,
  model,
  userId,
  billingCategory,
  branch,
  mode = "ask",
  userAccessToken,
  userEmail,
  userName,
}: {
  commentId: string
  streamId: string
  postId: string
  owner: string
  repo: string
  model: string
  userId: string
  billingCategory: BillingCategory
  branch?: string
  mode?: AgentMode
  userAccessToken?: string | null
  userEmail?: string | null
  userName?: string | null
}) {
  "use workflow"

  const writable = getWritable({ namespace: streamId })

  try {
    const { initialMessages, sandboxId, gitRef } = await setupStep({
      postId,
      commentId,
      owner,
      repo,
      branch,
      mode,
      userEmail,
      userName,
    })

    let finishReason: FinishReason | undefined
    let stepCount = 0
    let totalTokens = 0
    let totalCost = 0
    const newMessages: AgentUIMessage[] = []
    while (finishReason !== "stop" && stepCount < 100) {
      try {
        const result = await streamTextStep({
          owner,
          repo,
          gitRef,
          model,
          writable,
          sandboxId,
          initialMessages,
          newMessages,
          mode,
          postId,
          userAccessToken: userAccessToken ?? undefined,
        })
        finishReason = result.finishReason
        newMessages.push(...result.newMessages)
        totalTokens += result.totalTokens
        totalCost += result.cost
        stepCount += 1
      } catch (err) {
        console.error(err)
        newMessages.push({
          role: "assistant",
          id: `${streamId}-error-${ERROR_CODES.STREAM_STEP_ERROR}`,
          metadata: { errorCode: ERROR_CODES.STREAM_STEP_ERROR },
          parts: [
            {
              type: "text",
              text: "Something went wrong. Click Retry to try again.",
            },
          ],
        })
        break
      }
    }

    await closeStreamStep({
      writable,
      commentId,
      owner,
      repo,
      content: newMessages,
      postId,
      gitRef,
      totalTokens,
      totalCost,
      userId,
      billingCategory,
    })
  } catch (err) {
    // Handles FatalError from workflow system after max retries
    console.error("[Workflow Fatal]", err)

    await handleFatalErrorStep({ commentId, streamId, writable })
  }
}

async function handleFatalErrorStep({
  commentId,
  streamId,
  writable,
}: {
  commentId: string
  streamId: string
  writable: WritableStream
}) {
  "use step"

  const errorMessage: AgentUIMessage = {
    role: "assistant",
    id: `${streamId}-fatal-error`,
    metadata: { errorCode: ERROR_CODES.STREAM_STEP_ERROR },
    parts: [
      {
        type: "text",
        text: "Something went wrong. Click Retry to try again.",
      },
    ],
  }

  await Promise.all([
    db
      .update(comments)
      .set({
        streamStatus: "failed",
        content: [errorMessage],
      })
      .where(eq(comments.id, commentId)),
    writable.close(),
  ])
}

async function setupStep({
  postId,
  commentId,
  owner,
  repo,
  branch,
  mode = "ask",
  userEmail,
  userName,
}: {
  postId: string
  commentId: string
  owner: string
  repo: string
  branch?: string
  mode?: AgentMode
  userEmail?: string | null
  userName?: string | null
}): Promise<{
  initialMessages: AgentUIMessage[]
  sandboxId: string
  gitRef: string
}> {
  "use step"

  const currentComment = await db
    .select({ createdAt: comments.createdAt })
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1)
    .then((r) => r[0])

  if (!currentComment) {
    throw new Error("Comment not found")
  }

  const [allComments, post] = await Promise.all([
    db
      .select()
      .from(comments)
      .where(
        and(
          eq(comments.postId, postId),
          lt(comments.createdAt, currentComment.createdAt)
        )
      )
      .orderBy(asc(comments.createdAt)),
    db
      .select({ gitContexts: posts.gitContexts })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1)
      .then((r) => r[0]),
  ])

  const existingGitContext = post?.gitContexts?.[0]

  const workspace = await getWorkspace({
    sandboxId: null,
    gitContext: { owner, repo, ref: existingGitContext?.sha ?? branch },
    mode,
    postId,
    userEmail,
    userName,
  })

  if (!existingGitContext) {
    await db
      .update(posts)
      .set({ gitContexts: [workspace.gitContextData] })
      .where(eq(posts.id, postId))
  }

  if (!post) {
    throw new Error("Post not found")
  }

  return {
    initialMessages: allComments.flatMap((c) => c.content),
    sandboxId: workspace.sandbox.sandboxId,
    gitRef: existingGitContext?.sha ?? workspace.gitContextData.sha,
  }
}

const ASK_SYSTEM_PROMPT = (owner: string, repo: string) =>
  `You're assisting users in a forum about the GitHub repository \`${owner}/${repo}\`.

## Environment
The repo is already cloned and available. All file paths are relative to the workspace root. You can use Read, Grep, and List tools to explore the codebase.

## General Goals
Users might ask you anything, but generally, your goal should be to ground your knowledge with the source code to provide a sourced answer. Users want to get to the source. As you explore source code, you'll note that sometimes, repositories are documented (say, with comments, or markdown files). While that's certainly useful, nothing beats reading the actual source code, as documentation gets stale overtime.

Explore freely but not eagerly: let the user direct you, don't waste your context by being over-eager.`

const BUILD_SYSTEM_PROMPT = (owner: string, repo: string) =>
  `You're a developer assistant for the GitHub repository \`${owner}/${repo}\`.

## Environment
The repo is cloned in a temporary sandbox at \`/vercel/sandbox/${repo}\`. You start in this directory. You have full read/write access. All file paths are relative to the workspace root.

## Tools Available
- Read, Grep, List: explore and search the codebase
- Write: create or overwrite files
- Edit: make targeted replacements in existing files
- Bash: run shell commands (git, npm, tests, etc.)

## IMPORTANT: Always Create a PR
The sandbox is temporary - the user can ONLY see your changes if you push them to GitHub. Unless the user explicitly says otherwise, you MUST:
1. Create a feature branch with a unique 5-char suffix: \`git checkout -b forums/short-description-$(openssl rand -hex 3 | head -c5)\`
2. Make the requested changes
3. Commit with a clear message
4. Push and create a PR: \`git push -u origin HEAD && gh pr create --fill\`

Without a PR, your work is invisible and lost when the sandbox ends.

## Git Configuration
- Git is pre-configured: user identity is set to the authenticated user, and credentials are handled automatically.
- \`git push origin HEAD\` and \`gh\` commands just work. Do not modify git config or attempt manual authentication.
- Use \`git status\` to check state before committing
- Keep commits atomic and focused

## Best Practices
- Read relevant files before making changes
- Run tests after changes when applicable
- If tests fail, fix them before creating the PR`

async function streamTextStep({
  owner,
  repo,
  gitRef,
  model,
  writable,
  sandboxId,
  initialMessages,
  newMessages,
  mode = "ask",
  postId,
  userAccessToken,
}: {
  owner: string
  repo: string
  gitRef: string
  model: string
  writable: WritableStream
  sandboxId: string
  initialMessages: AgentUIMessage[]
  newMessages: UIMessage[]
  mode?: AgentMode
  postId?: string
  userAccessToken?: string
}): Promise<{
  finishReason: FinishReason
  newMessages: AgentUIMessage[]
  totalTokens: number
  cost: number
}> {
  "use step"

  const workspace = await getWorkspace({
    sandboxId,
    gitContext: { owner, repo, ref: gitRef },
    mode,
    postId,
  })
  const allMessages = [...initialMessages, ...newMessages] as AgentUIMessage[]

  const tools =
    mode === "build" && userAccessToken
      ? getAllTools({ workspace, userAccessToken })
      : getTools({ workspace })

  const systemPrompt =
    mode === "build"
      ? BUILD_SYSTEM_PROMPT(owner, repo)
      : ASK_SYSTEM_PROMPT(owner, repo)

  const result = streamText({
    messages: await convertToModelMessages(allMessages),
    tools,
    system: systemPrompt,
    model,
  })

  const stepNewMessages: AgentUIMessage[] = []
  const isFirstStep = newMessages.length === 0

  await result
    .toUIMessageStream({
      onFinish: ({ messages }) => {
        stepNewMessages.push(
          ...messages.map((m, index) => {
            return {
              ...m,
              id: nanoid(),
              metadata:
                isFirstStep && index === 0 && mode === "build" ? { mode } : {},
            } satisfies AgentUIMessage
          })
        )
      },
    })
    .pipeTo(writable, { preventClose: true })

  const usage = await result.usage
  const providerMetadata = await result.providerMetadata
  const parseCost = z
    .object({
      gateway: z.object({
        cost: z.string().transform((v) => Number(v)),
      }),
    })
    .safeParse(providerMetadata)

  return {
    finishReason: await result.finishReason,
    newMessages: stepNewMessages,
    totalTokens: usage.totalTokens ?? 0,
    cost: parseCost.success ? parseCost.data.gateway.cost : 0,
  }
}

async function closeStreamStep({
  writable,
  postId,
  commentId,
  owner,
  repo,
  content,
  gitRef,
  totalTokens,
  totalCost,
  userId,
  billingCategory,
}: {
  writable: WritableStream
  commentId: string
  postId: string
  owner: string
  repo: string
  content: AgentUIMessage[]
  gitRef: string
  totalTokens: number
  totalCost: number
  userId: string
  billingCategory: BillingCategory
}) {
  "use step"

  await Promise.all([
    writable.close(),
    db
      .update(comments)
      .set({ streamStatus: "completed", content, gitRef })
      .where(eq(comments.id, commentId)),
  ])

  // get the LLM response commment authorId and authorUsername
  const comment = await db
    .select({
      authorId: comments.authorId,
      authorUsername: comments.authorUsername,
    })
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1)
    .then((r) => r[0])

  if (comment) {
    // check each internal message for mentions
    // if there are no mentions in the message the function does nothing
    for (const message of content) {
      createMentions({
        sourcePostId: postId,
        sourceCommentId: commentId,
        authorId: comment.authorId,
        authorUsername: comment.authorUsername,
        content: message,
        owner,
        repo,
      })
    }
  }

  revalidateTag(`repo:${owner}:${repo}`, "max")
  revalidateTag(`post:${postId}`, "max")

  const credits = CREDIT_COSTS[billingCategory]
  try {
    await autumn.track({
      customer_id: userId,
      feature_id: "standard_credits",
      value: credits,
    })
  } catch (err) {
    console.error("Failed to track billing usage:", err)
  }

  await track("generated_response", {
    tokens: totalTokens,
    cost: totalCost,
  })
}

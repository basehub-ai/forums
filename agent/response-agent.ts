import {
  convertToModelMessages,
  type FinishReason,
  streamText,
  type UIMessage,
} from "ai"
import { asc, eq } from "drizzle-orm"
import { nanoid } from "nanoid"
import { revalidateTag } from "next/cache"
import { getWritable } from "workflow"
import { createMentions } from "@/lib/actions/posts"
import { db } from "@/lib/db/client"
import { comments, posts } from "@/lib/db/schema"
import { ERROR_CODES } from "@/lib/errors"
import { getTools } from "./tools"
import type { AgentUIMessage } from "./types"
import { getWorkspace } from "./workspace"

export async function responseAgent({
  commentId,
  streamId,
  postId,
  owner,
  repo,
  model,
}: {
  commentId: string
  streamId: string
  postId: string
  owner: string
  repo: string
  model: string
}) {
  "use workflow"

  const writable = getWritable({ namespace: streamId })

  const { initialMessages, sandboxId, gitRef } = await setupStep({
    postId,
    owner,
    repo,
  })

  let finishReason: FinishReason | undefined
  let stepCount = 0
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
      })
      finishReason = result.finishReason
      newMessages.push(...result.newMessages)
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
            text: "Sorry, I encountered an error while trying to respond. Please try again later.",
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
  })
}

async function setupStep({
  postId,
  owner,
  repo,
}: {
  postId: string
  owner: string
  repo: string
}): Promise<{
  initialMessages: AgentUIMessage[]
  sandboxId: string
  gitRef: string
}> {
  "use step"

  const [allComments, post] = await Promise.all([
    db
      .select()
      .from(comments)
      .where(eq(comments.postId, postId))
      .orderBy(asc(comments.createdAt)),
    db
      .select({ gitContext: posts.gitContext })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1)
      .then((r) => r[0]),
  ])

  const existingGitContext = post?.gitContext

  const workspace = await getWorkspace({
    sandboxId: null,
    gitContext: { owner, repo, ref: existingGitContext?.sha },
  })

  if (!existingGitContext) {
    await db
      .update(posts)
      .set({ gitContext: workspace.gitContextData })
      .where(eq(posts.id, postId))
  }

  return {
    initialMessages: allComments.flatMap((c) => c.content),
    sandboxId: workspace.sandbox.sandboxId,
    gitRef: existingGitContext?.sha ?? workspace.gitContextData.sha,
  }
}

async function streamTextStep({
  owner,
  repo,
  gitRef,
  model,
  writable,
  sandboxId,
  initialMessages,
  newMessages,
}: {
  owner: string
  repo: string
  gitRef: string
  model: string
  writable: WritableStream
  sandboxId: string
  initialMessages: AgentUIMessage[]
  newMessages: UIMessage[]
}): Promise<{ finishReason: FinishReason; newMessages: AgentUIMessage[] }> {
  "use step"

  const workspace = await getWorkspace({
    sandboxId,
    gitContext: { owner, repo, ref: gitRef },
  })
  const allMessages = [...initialMessages, ...newMessages] as AgentUIMessage[]

  const result = streamText({
    messages: await convertToModelMessages(allMessages),
    tools: getTools({ workspace }),
    system: `You are a coding agent. You're assisting users in a forum about the GitHub repository \`${owner}/${repo}\`. The repo is already cloned and available to you at path \`${workspace.path}\` (you're already cd'd into it, so all tools you use will be executed from this path).

## Post References
When a user mentions another post, you MUST use the ReadPost tool to fetch its content before responding. Post references can appear in these formats:
- \`#42\` → post 42 in the current repo (use owner: "${owner}", repo: "${repo}")
- \`owner/repo#42\` → post 42 in owner/repo
- \`owner/repo/42\` → post 42 in owner/repo
- \`/owner/repo/42\` → post 42 in owner/repo
- \`forums.basehub.com/owner/repo/42\` → post 42 in owner/repo
- The user can just tell you with natural language the owner, repo, and number of the post to read.

If you see any of these patterns, call ReadPost immediately to get the full context of the referenced post before formulating your answer.`,
    model,
  })

  const stepNewMessages: AgentUIMessage[] = []

  await result
    .toUIMessageStream({
      onFinish: ({ messages }) => {
        stepNewMessages.push(
          ...messages.map((m) => {
            return {
              ...m,
              id: nanoid(),
              metadata: {},
            } satisfies AgentUIMessage
          })
        )
      },
    })
    .pipeTo(writable, { preventClose: true })

  return {
    finishReason: await result.finishReason,
    newMessages: stepNewMessages,
  }
}

async function closeStreamStep({
  writable,
  postId,
  commentId,
  owner,
  repo,
  content,
}: {
  writable: WritableStream
  commentId: string
  postId: string
  owner: string
  repo: string
  content: AgentUIMessage[]
}) {
  "use step"

  await Promise.all([
    writable.close(),
    db
      .update(comments)
      .set({ streamId: null, content })
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
}

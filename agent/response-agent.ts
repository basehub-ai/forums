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

  const { initialMessages, sandboxId, gitRef, postNumber } = await setupStep({
    postId,
    commentId,
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
        postNumber,
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
    gitRef,
  })
}

async function setupStep({
  postId,
  commentId,
  owner,
  repo,
}: {
  postId: string
  commentId: string
  owner: string
  repo: string
}): Promise<{
  initialMessages: AgentUIMessage[]
  sandboxId: string
  gitRef: string
  postNumber: number
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
      .select({ gitContexts: posts.gitContexts, number: posts.number })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1)
      .then((r) => r[0]),
  ])

  const existingGitContext = post?.gitContexts?.[0]

  const workspace = await getWorkspace({
    sandboxId: null,
    gitContext: { owner, repo, ref: existingGitContext?.sha },
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
    postNumber: post.number,
  }
}

async function streamTextStep({
  owner,
  repo,
  gitRef,
  model,
  writable,
  sandboxId,
  postNumber,
  initialMessages,
  newMessages,
}: {
  owner: string
  repo: string
  gitRef: string
  model: string
  writable: WritableStream
  sandboxId: string
  postNumber: number
  initialMessages: AgentUIMessage[]
  newMessages: UIMessage[]
}): Promise<{ finishReason: FinishReason; newMessages: AgentUIMessage[] }> {
  "use step"

  const workspace = await getWorkspace({
    sandboxId,
    gitContext: { owner, repo, ref: gitRef },
  })
  const sessionId = `${owner}/${repo}/${postNumber}`
  const allMessages = [...initialMessages, ...newMessages] as AgentUIMessage[]

  const result = streamText({
    messages: await convertToModelMessages(allMessages),
    tools: getTools({ workspace, sessionId }),
    system: `You're assisting users in a forum about the GitHub repository \`${owner}/${repo}\`.

## Sandbox Environment
You're in a sandboxed environment where you can run commands and interact with the codebase. The repo is already cloned and available to you at path \`${workspace.path}\` (you're already cd'd into it, so all tools you use will be executed from this path).

You have access to a Bash tool that lets you execute any shell command in this environment. All file modifications you make are isolated to this post's session and won't affect the base repository or other posts. You can:
- Install dependencies (npm install, pip install, etc.)
- Run builds and tests
- Create, edit, or delete files
- Run any development commands

The sandbox preserves your changes across the conversation, so you can build upon previous modifications.

## General Goals
Users might ask you anything, but generally, your goal should be to ground your knowledge with the source code to provide a sourced answer. Users want to get to the source. As you explore source code, you'll note that sometimes, repositories are documented (say, with comments, or markdown files). While that's certainly useful, nothing beats reading the actual source code, as documentation gets stale overtime.

Explore freely but not eagerly: let the user direct you.`,
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
  gitRef,
}: {
  writable: WritableStream
  commentId: string
  postId: string
  owner: string
  repo: string
  content: AgentUIMessage[]
  gitRef: string
}) {
  "use step"

  await Promise.all([
    writable.close(),
    db
      .update(comments)
      .set({ streamId: null, content, gitRef })
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

import {
  convertToModelMessages,
  type FinishReason,
  streamText,
  type UIMessage,
} from "ai"
import { asc, eq } from "drizzle-orm"
import { nanoid } from "nanoid"
import { getWritable } from "workflow"
import { revalidateAfterStream } from "@/lib/actions/posts"
import { db } from "@/lib/db/client"
import { comments } from "@/lib/db/schema"
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

  const { initialMessages, sandboxId } = await setupStep({
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
}): Promise<{ initialMessages: AgentUIMessage[]; sandboxId: string }> {
  "use step"

  const [allComments, workspace] = await Promise.all([
    db
      .select()
      .from(comments)
      .where(eq(comments.postId, postId))
      .orderBy(asc(comments.createdAt)),
    getWorkspace({ sandboxId: null, gitContext: { owner, repo } }),
  ])

  return {
    initialMessages: allComments.flatMap((c) => c.content),
    sandboxId: workspace.sandbox.sandboxId,
  }
}

async function streamTextStep({
  owner,
  repo,
  model,
  writable,
  sandboxId,
  initialMessages,
  newMessages,
}: {
  owner: string
  repo: string
  model: string
  writable: WritableStream
  sandboxId: string
  initialMessages: AgentUIMessage[]
  newMessages: UIMessage[]
}): Promise<{ finishReason: FinishReason; newMessages: AgentUIMessage[] }> {
  "use step"

  const workspace = await getWorkspace({
    sandboxId,
    gitContext: { owner, repo },
  })
  const allMessages = [...initialMessages, ...newMessages]

  const result = streamText({
    messages: convertToModelMessages(allMessages),
    tools: getTools({ workspace }),
    system: `You are a coding agent. You're assisting users in a forum about the GitHub repository \`${owner}/${repo}\`. The repo is already cloned and available to you at path \`${workspace.path}\` (you're already cd'd into it, so all tools you use will be executed from this path).`,
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

  revalidateAfterStream({ owner, repo, postId })
}

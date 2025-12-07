import { waitUntil } from "@vercel/functions"
import { createUIMessageStreamResponse, generateText } from "ai"
import { revalidateTag } from "next/cache"
import { getRun, start } from "workflow/api"
import { agent, agentHook, type GitContext } from "@/agent"
import type { AgentUIMessage } from "@/agent/types"
import { getModel } from "@/lib/models"
import {
  getStreamId,
  pushMessages,
  redis,
  type StoredThread,
  setStreamId,
  threadKey,
} from "@/lib/redis"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params

  if (!threadId) {
    return new Response("threadId is required", { status: 400 })
  }

  const [thread, streamId] = await Promise.all([
    redis.get<StoredThread>(threadKey(threadId)),
    getStreamId(threadId),
  ])
  if (!(thread && streamId)) {
    return new Response("No active stream", { status: 404 })
  }

  const run = getRun(thread.runId)

  return createUIMessageStreamResponse({
    stream: run.getReadable({ namespace: streamId }),
    headers: { "x-workflow-run-id": thread.runId },
  })
}

export type ThreadRequest = {
  messages: AgentUIMessage[]
  now: number
  gitContext: GitContext
  model?: string
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const body = (await request.json()) as ThreadRequest

    const { messages, gitContext } = body
    const now = Date.now()
    const streamId = String(now)

    const { threadId } = (await params) ?? {}

    if (threadId.length > 32) {
      return new Response("Invalid threadId", { status: 400 })
    }

    const thread = await redis.get<StoredThread>(threadKey(threadId))

    let runId: string | undefined
    if (thread) {
      if (!thread) {
        return new Response("Thread not found", { status: 404 })
      }

      const [hook] = await Promise.all([
        agentHook.resume(thread.id, {
          type: "user-message",
          now,
          gitContext,
        }),
        redis.set<StoredThread>(threadKey(thread.id), {
          ...thread,
          updatedAt: now,
        }),
        setStreamId(thread.id, streamId),
        pushMessages(thread.id, messages),
      ])

      if (!hook) {
        return new Response("No active workflow found", { status: 404 })
      }
      runId = hook.runId
    } else {
      const [newRun] = await Promise.all([
        start(agent, [
          {
            threadId,
            initialEvent: { type: "user-message", now, gitContext },
            model: getModel(body.model).value,
          },
        ]),
        setStreamId(threadId, streamId),
        pushMessages(threadId, messages),
      ])
      runId = newRun.runId

      const newThread: StoredThread = {
        id: threadId,
        runId,
        owner: gitContext.owner,
        repo: gitContext.repo,
        createdAt: now,
        updatedAt: now,
      }
      await redis.set<StoredThread>(threadKey(threadId), newThread)

      const firstUserMessage = messages.find((m) => m.role === "user")
      const firstUserText = firstUserMessage?.parts
        .filter((p) => p.type === "text")
        .map((p) => p.text)
        .join("\n\n")

      if (firstUserText) {
        waitUntil(
          generateText({
            model: getModel("haiku").value,
            prompt: `Generate a short, concise title (max 5-7 words) for this thread based on the first user message. Only return the title text, nothing else.\n\nUser message: ${firstUserText}`,
          }).then(async (res) => {
            const title = res.text.trim()
            await redis.set<StoredThread>(threadKey(threadId), {
              ...newThread,
              title,
            })
            revalidateTag(`repo:${gitContext.owner}:${gitContext.repo}`, "max")
          })
        )
      }
    }

    revalidateTag(`repo:${gitContext.owner}:${gitContext.repo}`, "max")

    if (!runId) {
      throw new Error("expected runId by this point")
    }

    const run = getRun(runId)

    return createUIMessageStreamResponse({
      stream: run.getReadable({ namespace: streamId }),
      headers: { "x-workflow-run-id": runId },
    })
  } catch (error) {
    console.error(error)
    return new Response(
      error instanceof Error ? error.message : "Unknown error",
      { status: 500 }
    )
  }
}

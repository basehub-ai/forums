import { createUIMessageStreamResponse } from "ai"
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
    const body: ThreadRequest = await request.json()

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
        setStreamId(thread.id, streamId),
        pushMessages(thread.id, messages),
      ])

      if (!hook) {
        return new Response("No active workflow found", { status: 404 })
      }
      runId = hook.runId
    } else {
      const run = await start(agent, [
        {
          threadId,
          initialEvent: {
            type: "user-message",
            now,
            gitContext,
          },
          model: getModel(body.model).value,
        },
      ])
      runId = run.runId
      await Promise.all([
        redis.set<StoredThread>(threadKey(threadId), { id: threadId, runId }),
        setStreamId(threadId, streamId),
        pushMessages(threadId, messages),
      ])
    }

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

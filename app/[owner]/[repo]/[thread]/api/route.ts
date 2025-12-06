import { createUIMessageStreamResponse } from "ai"
import { getRun, start } from "workflow/api"
import { agent, agentHook } from "@/agent"
import type { AgentUIMessage } from "@/agent/types"
import { getModel } from "@/lib/models"
import {
  getStreamId,
  pushMessages,
  redis,
  type StoredChat,
  setStreamId,
} from "@/lib/redis"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const { chatId } = await params

  if (!chatId) {
    return new Response("chatId is required", { status: 400 })
  }

  const [chat, streamId] = await Promise.all([
    redis.get<StoredChat>(`chat:${chatId}`),
    getStreamId(chatId),
  ])
  if (!(chat && streamId)) {
    return new Response("No active stream", { status: 404 })
  }

  const run = getRun(chat.runId)

  return createUIMessageStreamResponse({
    stream: run.getReadable({ namespace: streamId }),
    headers: { "x-workflow-run-id": chat.runId },
  })
}

export type ChatRequest = {
  messages: AgentUIMessage[]
  now: number
  model?: string
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const body: ChatRequest = await request.json()

    const { messages } = body
    const now = Date.now()
    const streamId = String(now)

    const { chatId } = (await params) ?? {}

    if (chatId.length > 32) {
      return new Response("Invalid chatId", { status: 400 })
    }

    const chat = await redis.get<StoredChat>(`chat:${chatId}`)

    let runId: string | undefined
    if (chat) {
      if (!chat) {
        return new Response("Chat not found", { status: 404 })
      }

      const [hook] = await Promise.all([
        agentHook.resume(chat.id, {
          type: "user-message",
          now,
        }),
        setStreamId(chat.id, streamId),
        pushMessages(chat.id, messages),
      ])

      if (!hook) {
        return new Response("No active workflow found", { status: 404 })
      }
      runId = hook.runId
    } else {
      const run = await start(agent, [
        {
          chatId,
          initialEvent: { type: "user-message", now },
          model: getModel(body.model).value,
        },
      ])
      runId = run.runId
      await Promise.all([
        redis.set<StoredChat>(`chat:${chatId}`, {
          id: chatId,
          runId,
        }),
        setStreamId(chatId, streamId),
        pushMessages(chatId, messages),
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

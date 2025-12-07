import type { NextRequest } from "next/server"
import {
  redis,
  type StoredInterrupt,
  type StoredThread,
  threadKey,
} from "@/lib/redis"

export type InterruptRequest = {
  now: number
}

const enabled = false

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  if (!enabled) {
    return new Response("Not found", { status: 404 })
  }

  try {
    const { threadId } = await params
    if (!threadId) {
      return new Response("Missing threadId", { status: 400 })
    }
    const thread = await redis.get<StoredThread>(threadKey(threadId))
    if (!thread) {
      return new Response("Thread not found", { status: 404 })
    }
    const body = (await request.json()) as InterruptRequest
    await redis.set<StoredInterrupt>(`interrupt:${thread.id}`, {
      timestamp: body.now,
    })

    return new Response(null, { status: 200 })
  } catch (error) {
    console.error("[INTERRUPT]", error)
    return new Response(
      error instanceof Error ? error.message : "Unknown error",
      { status: 500 }
    )
  }
}

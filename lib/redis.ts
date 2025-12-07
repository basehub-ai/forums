import { Redis } from "@upstash/redis"
import type { AgentUIMessage } from "@/agent/types"

export const redis = Redis.fromEnv()

// types

export type StoredThread = {
  id: string
  runId: string
}

export type StoredThreadClient = StoredThread & {
  streamId: string | null
  messages: AgentUIMessage[]
}

export const threadKey = (threadId: string) => `thread:${threadId}`

// Stream ID operations (separate key for atomic compare-and-clear)

const streamKey = (threadId: string) => `thread:${threadId}:stream`

export async function setStreamId(
  threadId: string,
  streamId: string
): Promise<void> {
  await redis.set(streamKey(threadId), streamId)
}

export async function getStreamId(chatId: string): Promise<string | null> {
  const val = await redis.get(streamKey(chatId))
  return val !== null ? String(val) : null
}

/**
 * Atomically clear streamId only if it matches the expected value.
 * Prevents race where a new stream starts before old one finishes.
 */
export async function clearStreamIdIf(
  chatId: string,
  expectedStreamId: string
): Promise<boolean> {
  const result = await redis.eval(
    `if redis.call('GET', KEYS[1]) == ARGV[1] then
      redis.call('DEL', KEYS[1])
      return 1
    end
    return 0`,
    [streamKey(chatId)],
    [expectedStreamId]
  )
  return result === 1
}

// Message operations using Redis list (atomic, no race conditions)

const messagesKey = (threadId: string) => `thread:${threadId}:messages`

export async function pushMessages(
  threadId: string,
  messages: AgentUIMessage[]
): Promise<void> {
  if (messages.length === 0) {
    return
  }
  const serialized = messages.map((m, i) =>
    JSON.stringify({
      ...m,
      metadata: { ts: Date.now() + i },
    } satisfies AgentUIMessage)
  )
  await redis.rpush(messagesKey(threadId), ...serialized)
}

export async function getMessages(chatId: string): Promise<AgentUIMessage[]> {
  const raw = await redis.lrange<string>(messagesKey(chatId), 0, -1)
  return raw.map((s) => (typeof s === "string" ? JSON.parse(s) : s))
}

export type StoredInterrupt = {
  timestamp: number
}

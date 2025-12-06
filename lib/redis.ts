import { Redis } from "@upstash/redis";
import type { UIMessage } from "ai";

export const redis = Redis.fromEnv();

// types

export type StoredChat = {
  id: string;
  runId: string;
};

export type StoredChatClient = StoredChat & {
  streamId: string | null;
  messages: UIMessage[];
};

// Stream ID operations (separate key for atomic compare-and-clear)

const streamKey = (chatId: string) => `chat:${chatId}:stream`;

export async function setStreamId(
  chatId: string,
  streamId: string
): Promise<void> {
  await redis.set(streamKey(chatId), streamId);
}

export async function getStreamId(chatId: string): Promise<string | null> {
  const val = await redis.get(streamKey(chatId));
  return val !== null ? String(val) : null;
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
  );
  return result === 1;
}

// Message operations using Redis list (atomic, no race conditions)

const messagesKey = (chatId: string) => `chat:${chatId}:messages`;

export async function pushMessages(
  chatId: string,
  messages: UIMessage[]
): Promise<void> {
  if (messages.length === 0) {
    return;
  }
  const serialized = messages.map((m) => JSON.stringify(m));
  await redis.rpush(messagesKey(chatId), ...serialized);
}

export async function getMessages(chatId: string): Promise<UIMessage[]> {
  const raw = await redis.lrange<string>(messagesKey(chatId), 0, -1);
  return raw.map((s) => (typeof s === "string" ? JSON.parse(s) : s));
}

export type StoredInterrupt = {
  timestamp: number;
};

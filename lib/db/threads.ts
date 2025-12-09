import type { InferSelectModel } from "drizzle-orm"
import { omit } from "lodash-es"
import type { messages, threads } from "./schema"

export type DBThread = InferSelectModel<typeof threads>
export type DBMessage = InferSelectModel<typeof messages>

export type ClientThread = Omit<DBThread, "runId" | "createdAt" | "updatedAt">

export function toClientThread(thread: DBThread): ClientThread {
  return omit(thread, ["runId", "createdAt", "updatedAt"])
}

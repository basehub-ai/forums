import * as p from "drizzle-orm/pg-core"
import type { AgentUIMessage } from "@/agent/types"

export const threads = p.pgTable(
  "threads",
  {
    id: p.varchar({ length: 32 }).primaryKey(),
    owner: p.varchar({ length: 255 }).notNull(),
    repo: p.varchar({ length: 255 }).notNull(),
    runId: p.varchar("run_id", { length: 255 }).notNull(),
    title: p.varchar({ length: 500 }),
    streamId: p.varchar("stream_id", { length: 32 }),
    createdAt: p.bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: p.bigint("updated_at", { mode: "number" }).notNull(),
  },
  (table) => [
    p
      .index("idx_threads_owner_repo")
      .on(table.owner, table.repo, table.id.desc()),
  ]
)

export const messages = p.pgTable(
  "messages",
  {
    id: p.varchar({ length: 32 }).primaryKey(),
    threadId: p.varchar("thread_id", { length: 32 }).notNull(),
    content: p.jsonb().$type<AgentUIMessage>().notNull(),
    createdAt: p.bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    p.index("idx_messages_thread_created").on(table.threadId, table.createdAt),
  ]
)

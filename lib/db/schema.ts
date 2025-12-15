import * as p from "drizzle-orm/pg-core"
import type { AgentUIMessage } from "@/agent/types"

export const posts = p.pgTable(
  "posts",
  {
    id: p.varchar({ length: 32 }).primaryKey(),
    number: p.integer().notNull(),
    owner: p.varchar({ length: 255 }).notNull(),
    repo: p.varchar({ length: 255 }).notNull(),

    title: p.varchar({ length: 500 }),
    categoryId: p.varchar("category_id", { length: 32 }),
    rootCommentId: p.varchar("root_comment_id", { length: 32 }),

    authorId: p.varchar("author_id", { length: 255 }).notNull(),

    createdAt: p.bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: p.bigint("updated_at", { mode: "number" }).notNull(),
  },
  (table) => [
    p
      .uniqueIndex("idx_posts_owner_repo_number")
      .on(table.owner, table.repo, table.number),
    p
      .index("idx_posts_owner_repo")
      .on(table.owner, table.repo, table.id.desc()),
    p.index("idx_posts_author").on(table.authorId),
  ]
)

export const comments = p.pgTable(
  "comments",
  {
    id: p.varchar({ length: 32 }).primaryKey(),
    postId: p.varchar("post_id", { length: 32 }).notNull(),
    threadCommentId: p.varchar("thread_comment_id", { length: 32 }),

    authorId: p.varchar("author_id", { length: 255 }).notNull(),
    authorUsername: p.varchar("author_username", { length: 255 }),

    seekingAnswerFrom: p.varchar("seeking_answer_from", { length: 32 }),

    content: p.jsonb().$type<AgentUIMessage[]>().notNull(),
    mentions: p.jsonb("mentions").$type<string[]>().default([]),

    runId: p.varchar("run_id", { length: 255 }),
    streamId: p.varchar("stream_id", { length: 32 }),

    createdAt: p.bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: p.bigint("updated_at", { mode: "number" }).notNull(),
  },
  (table) => [
    p.index("idx_comments_post_created").on(table.postId, table.createdAt),
    p.index("idx_comments_thread").on(table.threadCommentId),
    p.index("idx_comments_author").on(table.authorId),
    p.index("idx_comments_stream").on(table.streamId),
  ]
)

export const categories = p.pgTable(
  "categories",
  {
    id: p.varchar({ length: 32 }).primaryKey(),
    owner: p.varchar({ length: 255 }).notNull(),
    repo: p.varchar({ length: 255 }).notNull(),
    title: p.varchar({ length: 100 }).notNull(),
    emoji: p.varchar({ length: 10 }),
    createdAt: p.bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    p
      .uniqueIndex("idx_categories_owner_repo_title")
      .on(table.owner, table.repo, table.title),
  ]
)

export const reactions = p.pgTable(
  "reactions",
  {
    id: p.varchar({ length: 32 }).primaryKey(),
    userId: p.varchar("user_id", { length: 255 }).notNull(),
    commentId: p.varchar("comment_id", { length: 32 }).notNull(),
    type: p.varchar({ length: 32 }).notNull(),
    createdAt: p.bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    p
      .uniqueIndex("idx_reactions_unique")
      .on(table.userId, table.commentId, table.type),
    p.index("idx_reactions_comment").on(table.commentId),
  ]
)

export const llmUsers = p.pgTable("llm_users", {
  id: p.varchar({ length: 32 }).primaryKey(),
  name: p.varchar({ length: 100 }).notNull(),
  model: p.varchar({ length: 100 }).notNull(),
  provider: p.varchar({ length: 32 }).notNull(),
  image: p.varchar({ length: 500 }),
  isDefault: p.boolean("is_default").notNull(),
  isInModelPicker: p.boolean("is_in_model_picker").notNull(),
  deprecatedAt: p.bigint("deprecated_at", { mode: "number" }),
  createdAt: p.bigint("created_at", { mode: "number" }).notNull(),
})

export const postCounters = p.pgTable(
  "post_counters",
  {
    owner: p.varchar({ length: 255 }).notNull(),
    repo: p.varchar({ length: 255 }).notNull(),
    lastNumber: p.integer("last_number").notNull().default(0),
  },
  (table) => [p.primaryKey({ columns: [table.owner, table.repo] })]
)

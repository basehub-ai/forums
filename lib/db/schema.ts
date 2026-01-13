import * as p from "drizzle-orm/pg-core"
import type { AgentUIMessage, GitContextData, PostAnswer } from "@/agent/types"

export const posts = p.pgTable(
  "posts",
  {
    id: p.varchar({ length: 32 }).primaryKey(),
    number: p.integer().notNull(),
    owner: p.varchar({ length: 255 }).notNull(),
    repo: p.varchar({ length: 255 }).notNull(),
    gitContexts: p.jsonb("git_contexts").$type<GitContextData[]>(),

    title: p.varchar({ length: 500 }),
    categoryId: p.varchar("category_id", { length: 32 }),
    rootCommentId: p.varchar("root_comment_id", { length: 32 }),

    authorId: p.varchar("author_id", { length: 255 }).notNull(),

    answer: p.jsonb().$type<PostAnswer>(),

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

    runId: p.varchar("run_id", { length: 255 }),
    streamId: p.varchar("stream_id", { length: 32 }),
    streamStatus: p
      .varchar("stream_status", { length: 32 })
      .$type<"idle" | "streaming" | "completed">()
      .default("idle"),

    createdAt: p.bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: p.bigint("updated_at", { mode: "number" }).notNull(),
    gitRef: p.varchar("git_ref", { length: 40 }),
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
  billing_category: p
    .varchar("billing_category", { length: 32 })
    .notNull()
    .default("standard"),
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

export const mentions = p.pgTable(
  "mentions",
  {
    id: p.varchar({ length: 32 }).primaryKey(),
    targetPostId: p.varchar("target_post_id", { length: 32 }).notNull(),
    sourcePostId: p.varchar("source_post_id", { length: 32 }).notNull(),
    sourceCommentId: p.varchar("source_comment_id", { length: 32 }).notNull(),
    sourcePostNumber: p.integer("source_post_number").notNull(),
    sourcePostTitle: p.varchar("source_post_title", { length: 500 }),
    sourcePostOwner: p.varchar("source_post_owner", { length: 255 }).notNull(),
    sourcePostRepo: p.varchar("source_post_repo", { length: 255 }).notNull(),
    authorId: p.varchar("author_id", { length: 255 }).notNull(),
    authorUsername: p.varchar("author_username", { length: 255 }),
    createdAt: p.bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    p.index("idx_mentions_target").on(table.targetPostId, table.createdAt),
    p
      .uniqueIndex("idx_mentions_unique")
      .on(table.targetPostId, table.sourceCommentId),
  ]
)

// Better Auth tables
export const user = p.pgTable("user", {
  id: p.text("id").primaryKey(),
  name: p.text("name").notNull(),
  email: p.text("email").notNull().unique(),
  emailVerified: p.boolean("email_verified").notNull(),
  image: p.text("image"),
  username: p.text("username"),
  createdAt: p.timestamp("created_at").notNull(),
  updatedAt: p.timestamp("updated_at").notNull(),
})

export const session = p.pgTable("session", {
  id: p.text("id").primaryKey(),
  userId: p
    .text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: p.text("token").notNull().unique(),
  expiresAt: p.timestamp("expires_at").notNull(),
  ipAddress: p.text("ip_address"),
  userAgent: p.text("user_agent"),
  createdAt: p.timestamp("created_at").notNull(),
  updatedAt: p.timestamp("updated_at").notNull(),
})

export const account = p.pgTable("account", {
  id: p.text("id").primaryKey(),
  accountId: p.text("account_id").notNull(),
  providerId: p.text("provider_id").notNull(),
  userId: p
    .text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: p.text("access_token"),
  refreshToken: p.text("refresh_token"),
  accessTokenExpiresAt: p.timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: p.timestamp("refresh_token_expires_at"),
  scope: p.text("scope"),
  idToken: p.text("id_token"),
  password: p.text("password"),
  createdAt: p.timestamp("created_at").notNull(),
  updatedAt: p.timestamp("updated_at").notNull(),
})

export const verification = p.pgTable("verification", {
  id: p.text("id").primaryKey(),
  identifier: p.text("identifier").notNull(),
  value: p.text("value").notNull(),
  expiresAt: p.timestamp("expires_at").notNull(),
  createdAt: p.timestamp("created_at"),
  updatedAt: p.timestamp("updated_at"),
})

import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core"
import type { AgentUIMessage, GitContextData } from "@/agent/types"

export const posts = pgTable(
  "posts",
  {
    id: varchar({ length: 32 }).primaryKey(),
    number: integer().notNull(),
    owner: varchar({ length: 255 }).notNull(),
    repo: varchar({ length: 255 }).notNull(),
    gitContexts: jsonb("git_contexts").$type<GitContextData[]>(),

    title: varchar({ length: 500 }),
    categoryId: varchar("category_id", { length: 32 }),
    rootCommentId: varchar("root_comment_id", { length: 32 }),

    authorId: varchar("author_id", { length: 255 }).notNull(),

    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
    pinned: boolean().notNull().default(false),
  },
  (table) => [
    uniqueIndex("idx_posts_owner_repo_number").on(
      table.owner,
      table.repo,
      table.number
    ),
    index("idx_posts_owner_repo").on(table.owner, table.repo, table.id.desc()),
    index("idx_posts_author").on(table.authorId),
  ]
)

export const comments = pgTable(
  "comments",
  {
    id: varchar({ length: 32 }).primaryKey(),
    postId: varchar("post_id", { length: 32 }).notNull(),
    threadCommentId: varchar("thread_comment_id", { length: 32 }),

    authorId: varchar("author_id", { length: 255 }).notNull(),
    authorUsername: varchar("author_username", { length: 255 }),

    seekingAnswerFrom: varchar("seeking_answer_from", { length: 32 }),

    content: jsonb().$type<AgentUIMessage[]>().notNull(),

    runId: varchar("run_id", { length: 255 }),
    streamId: varchar("stream_id", { length: 32 }),
    streamStatus: varchar("stream_status", { length: 32 })
      .$type<"idle" | "streaming" | "completed" | "failed">()
      .default("idle"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
    gitRef: varchar("git_ref", { length: 40 }),
  },
  (table) => [
    index("idx_comments_post_created").on(table.postId, table.createdAt),
    index("idx_comments_thread").on(table.threadCommentId),
    index("idx_comments_author").on(table.authorId),
    index("idx_comments_stream").on(table.streamId),
  ]
)

export const categories = pgTable(
  "categories",
  {
    id: varchar({ length: 32 }).primaryKey(),
    owner: varchar({ length: 255 }).notNull(),
    repo: varchar({ length: 255 }).notNull(),
    title: varchar({ length: 100 }).notNull(),
    emoji: varchar({ length: 10 }),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    uniqueIndex("idx_categories_owner_repo_title").on(
      table.owner,
      table.repo,
      table.title
    ),
  ]
)

export const reactions = pgTable(
  "reactions",
  {
    id: varchar({ length: 32 }).primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    commentId: varchar("comment_id", { length: 32 }).notNull(),
    type: varchar({ length: 32 }).notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    uniqueIndex("idx_reactions_unique").on(
      table.userId,
      table.commentId,
      table.type
    ),
    index("idx_reactions_comment").on(table.commentId),
  ]
)

export const llmUsers = pgTable("llm_users", {
  id: varchar({ length: 32 }).primaryKey(),
  name: varchar({ length: 100 }).notNull(),
  model: varchar({ length: 100 }).notNull(),
  billing_category: varchar("billing_category", { length: 32 })
    .notNull()
    .default("standard"),
  provider: varchar({ length: 32 }).notNull(),
  image: varchar({ length: 500 }),
  isDefault: boolean("is_default").notNull(),
  isInModelPicker: boolean("is_in_model_picker").notNull(),
  deprecatedAt: bigint("deprecated_at", { mode: "number" }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
})

export const postCounters = pgTable(
  "post_counters",
  {
    owner: varchar({ length: 255 }).notNull(),
    repo: varchar({ length: 255 }).notNull(),
    lastNumber: integer("last_number").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.owner, table.repo] })]
)

export const mentions = pgTable(
  "mentions",
  {
    id: varchar({ length: 32 }).primaryKey(),
    targetPostId: varchar("target_post_id", { length: 32 }).notNull(),
    sourcePostId: varchar("source_post_id", { length: 32 }).notNull(),
    sourceCommentId: varchar("source_comment_id", { length: 32 }).notNull(),
    sourcePostNumber: integer("source_post_number").notNull(),
    sourcePostTitle: varchar("source_post_title", { length: 500 }),
    sourcePostOwner: varchar("source_post_owner", { length: 255 }).notNull(),
    sourcePostRepo: varchar("source_post_repo", { length: 255 }).notNull(),
    authorId: varchar("author_id", { length: 255 }).notNull(),
    authorUsername: varchar("author_username", { length: 255 }),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [
    index("idx_mentions_target").on(table.targetPostId, table.createdAt),
    uniqueIndex("idx_mentions_unique").on(
      table.targetPostId,
      table.sourceCommentId
    ),
  ]
)

// Better Auth tables
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  username: text("username"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
})

export const oauthApplication = pgTable(
  "oauth_application",
  {
    id: text("id").primaryKey(),
    name: text("name"),
    icon: text("icon"),
    metadata: text("metadata"),
    clientId: text("client_id").unique(),
    clientSecret: text("client_secret"),
    redirectUrls: text("redirect_urls"),
    type: text("type"),
    disabled: boolean("disabled").default(false),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [index("oauthApplication_userId_idx").on(table.userId)]
)

export const oauthAccessToken = pgTable(
  "oauth_access_token",
  {
    id: text("id").primaryKey(),
    accessToken: text("access_token").unique(),
    refreshToken: text("refresh_token").unique(),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    clientId: text("client_id").references(() => oauthApplication.clientId, {
      onDelete: "cascade",
    }),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    scopes: text("scopes"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
  },
  (table) => [
    index("oauthAccessToken_clientId_idx").on(table.clientId),
    index("oauthAccessToken_userId_idx").on(table.userId),
  ]
)

export const oauthConsent = pgTable(
  "oauth_consent",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id").references(() => oauthApplication.clientId, {
      onDelete: "cascade",
    }),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    scopes: text("scopes"),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
    consentGiven: boolean("consent_given"),
  },
  (table) => [
    index("oauthConsent_clientId_idx").on(table.clientId),
    index("oauthConsent_userId_idx").on(table.userId),
  ]
)

import { sql } from "drizzle-orm"
import type { InferSelectModel } from "drizzle-orm"
import { db } from "./db/client"
import type { comments as commentsTable, posts as postsTable } from "./db/schema"
import { comments, posts } from "./db/schema"
import { typesense } from "./typesense"

type Post = InferSelectModel<typeof postsTable>
type Comment = InferSelectModel<typeof commentsTable>

const POSTS_COLLECTION = "posts"
const COMMENTS_COLLECTION = "comments"
const REPOS_COLLECTION = "repos"

let collectionsEnsured: Promise<void> | null = null

function ensureCollectionsOnce() {
  if (!collectionsEnsured) {
    collectionsEnsured = ensureCollections().catch((err) => {
      collectionsEnsured = null
      throw err
    })
  }
  return collectionsEnsured
}

export async function ensureCollections() {
  const collections = await typesense.collections().retrieve()
  const existingNames = new Set(collections.map((c) => c.name))

  if (!existingNames.has(POSTS_COLLECTION)) {
    await typesense.collections().create({
      name: POSTS_COLLECTION,
      fields: [
        { name: "id", type: "string" },
        { name: "number", type: "int32" },
        { name: "owner", type: "string", facet: true },
        { name: "repo", type: "string", facet: true },
        { name: "title", type: "string", optional: true },
        { name: "categoryId", type: "string", optional: true, facet: true },
        { name: "authorId", type: "string", facet: true },
        { name: "commentCount", type: "int32" },
        { name: "createdAt", type: "int64" },
      ],
      default_sorting_field: "createdAt",
    })
  }

  if (!existingNames.has(COMMENTS_COLLECTION)) {
    await typesense.collections().create({
      name: COMMENTS_COLLECTION,
      fields: [
        { name: "id", type: "string" },
        { name: "postId", type: "string", facet: true },
        { name: "postNumber", type: "int32" },
        { name: "postTitle", type: "string", optional: true },
        { name: "owner", type: "string", facet: true },
        { name: "repo", type: "string", facet: true },
        { name: "categoryId", type: "string", optional: true, facet: true },
        { name: "authorId", type: "string", facet: true },
        { name: "text", type: "string" },
        { name: "isRootComment", type: "bool", facet: true },
        { name: "createdAt", type: "int64" },
      ],
      default_sorting_field: "createdAt",
    })
  }

  if (!existingNames.has(REPOS_COLLECTION)) {
    await typesense.collections().create({
      name: REPOS_COLLECTION,
      fields: [
        { name: "id", type: "string" },
        { name: "name", type: "string" },
        { name: "owner", type: "string", facet: true },
        { name: "repo", type: "string", facet: true },
        { name: "postCount", type: "int32" },
        { name: "lastActive", type: "int64" },
      ],
      default_sorting_field: "lastActive",
    })
  }
}

export async function indexPost(post: Post, commentCount: number) {
  await ensureCollectionsOnce()
  await typesense
    .collections(POSTS_COLLECTION)
    .documents()
    .upsert({
      id: post.id,
      number: post.number,
      owner: post.owner,
      repo: post.repo,
      title: post.title ?? "",
      categoryId: post.categoryId ?? "",
      authorId: post.authorId,
      commentCount,
      createdAt: post.createdAt,
    })
}

export async function updatePostIndex(
  postId: string,
  updates: {
    title?: string
    categoryId?: string
    commentCount?: number
  }
) {
  await ensureCollectionsOnce()
  const doc: Record<string, unknown> = {}
  if (updates.title !== undefined) doc.title = updates.title
  if (updates.categoryId !== undefined) doc.categoryId = updates.categoryId
  if (updates.commentCount !== undefined) doc.commentCount = updates.commentCount

  await typesense.collections(POSTS_COLLECTION).documents(postId).update(doc)
}

function extractText(comment: Comment): string {
  return comment.content
    .flatMap((msg) =>
      msg.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
    )
    .join("\n\n")
}

export async function indexComment(
  comment: Comment,
  meta: {
    owner: string
    repo: string
    postNumber: number
    postTitle: string | null
    categoryId: string | null
    isRootComment: boolean
  }
) {
  const text = extractText(comment)
  if (!text.trim()) return

  await ensureCollectionsOnce()
  await typesense
    .collections(COMMENTS_COLLECTION)
    .documents()
    .upsert({
      id: comment.id,
      postId: comment.postId,
      postNumber: meta.postNumber,
      postTitle: meta.postTitle ?? "",
      owner: meta.owner,
      repo: meta.repo,
      categoryId: meta.categoryId ?? "",
      authorId: comment.authorId,
      text,
      isRootComment: meta.isRootComment,
      createdAt: comment.createdAt,
    })
}

export async function deleteCommentFromIndex(commentId: string) {
  try {
    await typesense
      .collections(COMMENTS_COLLECTION)
      .documents(commentId)
      .delete()
  } catch {
    // ignore if not found
  }
}

export async function deletePostFromIndex(postId: string) {
  try {
    await typesense.collections(POSTS_COLLECTION).documents(postId).delete()
    await typesense
      .collections(COMMENTS_COLLECTION)
      .documents()
      .delete({ filter_by: `postId:=${postId}` })
  } catch {
    // ignore if not found
  }
}

// --- Repo indexing ---

export async function indexRepo(params: { owner: string; repo: string }) {
  const { owner, repo } = params

  const result = await db
    .select({
      postCount: sql<number>`count(distinct ${posts.id})::int`,
      lastActive: sql<number>`greatest(max(${posts.updatedAt}), coalesce(max(${comments.updatedAt}), 0))`,
    })
    .from(posts)
    .leftJoin(comments, sql`${comments.postId} = ${posts.id}`)
    .where(sql`${posts.owner} = ${owner} AND ${posts.repo} = ${repo}`)

  const stats = result[0]
  if (!stats || stats.postCount === 0) return

  await ensureCollectionsOnce()
  await typesense
    .collections(REPOS_COLLECTION)
    .documents()
    .upsert({
      id: `${owner}/${repo}`,
      name: `${owner}/${repo}`,
      owner,
      repo,
      postCount: stats.postCount,
      lastActive: Number(stats.lastActive) || Date.now(),
    })
}

export async function indexAllRepos(): Promise<number> {
  const repoStats = await db
    .select({
      owner: posts.owner,
      repo: posts.repo,
      postCount: sql<number>`count(distinct ${posts.id})::int`,
      lastActive: sql<number>`greatest(max(${posts.updatedAt}), coalesce(max(${comments.updatedAt}), 0))`,
    })
    .from(posts)
    .leftJoin(comments, sql`${comments.postId} = ${posts.id}`)
    .groupBy(posts.owner, posts.repo)

  if (repoStats.length === 0) return 0

  await ensureCollectionsOnce()

  for (const r of repoStats) {
    await typesense
      .collections(REPOS_COLLECTION)
      .documents()
      .upsert({
        id: `${r.owner}/${r.repo}`,
        name: `${r.owner}/${r.repo}`,
        owner: r.owner,
        repo: r.repo,
        postCount: r.postCount,
        lastActive: Number(r.lastActive) || Date.now(),
      })
  }

  return repoStats.length
}

export type RepoSearchResult = {
  name: string
  owner: string
  repo: string
  postCount: number
  lastActive: number
}

export async function searchRepos(query: string): Promise<RepoSearchResult[]> {
  if (!query || query.length < 2) return []

  await ensureCollectionsOnce()

  const result = await typesense
    .collections(REPOS_COLLECTION)
    .documents()
    .search({
      q: query,
      query_by: "name",
      prefix: true,
      per_page: 20,
    })

  return (result.hits ?? []).map((hit) => {
    const doc = hit.document as {
      name: string
      owner: string
      repo: string
      postCount: number
      lastActive: number
    }
    return {
      name: doc.name,
      owner: doc.owner,
      repo: doc.repo,
      postCount: doc.postCount,
      lastActive: doc.lastActive,
    }
  })
}

// --- Full reindex ---

export async function deleteAllCollections() {
  const collections = await typesense.collections().retrieve()
  for (const col of collections) {
    if ([POSTS_COLLECTION, COMMENTS_COLLECTION, REPOS_COLLECTION].includes(col.name)) {
      await typesense.collections(col.name).delete()
    }
  }
  collectionsEnsured = null
}

export async function reindexAll(): Promise<{
  repos: number
  posts: number
  comments: number
}> {
  await deleteAllCollections()
  await ensureCollections()

  const repoCount = await indexAllRepos()

  const allPosts = await db
    .select({
      id: posts.id,
      number: posts.number,
      owner: posts.owner,
      repo: posts.repo,
      title: posts.title,
      categoryId: posts.categoryId,
      authorId: posts.authorId,
      rootCommentId: posts.rootCommentId,
      createdAt: posts.createdAt,
      commentCount: sql<number>`(
        SELECT COUNT(*) FROM comments WHERE comments.post_id = ${posts.id}
      )`.as("comment_count"),
    })
    .from(posts)

  for (const post of allPosts) {
    await typesense
      .collections(POSTS_COLLECTION)
      .documents()
      .upsert({
        id: post.id,
        number: post.number,
        owner: post.owner,
        repo: post.repo,
        title: post.title ?? "",
        categoryId: post.categoryId ?? "",
        authorId: post.authorId,
        commentCount: post.commentCount,
        createdAt: post.createdAt,
      })
  }

  const postsById = Object.fromEntries(allPosts.map((p) => [p.id, p]))

  const allComments = await db.select().from(comments)

  let commentCount = 0
  for (const comment of allComments) {
    const post = postsById[comment.postId]
    if (!post) continue

    const text = extractText(comment)
    if (!text.trim()) continue

    const isRootComment = comment.id === post.rootCommentId

    await typesense
      .collections(COMMENTS_COLLECTION)
      .documents()
      .upsert({
        id: comment.id,
        postId: comment.postId,
        postNumber: post.number,
        postTitle: post.title ?? "",
        owner: post.owner,
        repo: post.repo,
        categoryId: post.categoryId ?? "",
        authorId: comment.authorId,
        text,
        isRootComment,
        createdAt: comment.createdAt,
      })

    commentCount++
  }

  return { repos: repoCount, posts: allPosts.length, comments: commentCount }
}

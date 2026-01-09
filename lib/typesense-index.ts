import { embed } from "ai"
import type { InferSelectModel } from "drizzle-orm"
import { eq, inArray, sql } from "drizzle-orm"
import { db } from "@/lib/db/client"
import type { comments, posts } from "./db/schema"
import { typesense } from "./typesense"

type Post = InferSelectModel<typeof posts>
type Comment = InferSelectModel<typeof comments>

const POSTS_COLLECTION = "posts"
const COMMENTS_COLLECTION = "comments"
const REPOS_COLLECTION = "repos"
const EMBEDDING_DIMENSIONS = 1536

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
        { name: "owner", type: "string", facet: true },
        { name: "repo", type: "string", facet: true },
        { name: "authorId", type: "string", facet: true },
        { name: "text", type: "string" },
        { name: "isRootComment", type: "bool", facet: true },
        { name: "createdAt", type: "int64" },
        {
          name: "embedding",
          type: "float[]",
          num_dim: EMBEDDING_DIMENSIONS,
          optional: true,
        },
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
        { name: "owner", type: "string" },
        { name: "repo", type: "string" },
        { name: "posts", type: "int32" },
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
  if (updates.title !== undefined) {
    doc.title = updates.title
  }
  if (updates.categoryId !== undefined) {
    doc.categoryId = updates.categoryId
  }
  if (updates.commentCount !== undefined) {
    doc.commentCount = updates.commentCount
  }

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
  owner: string,
  repo: string,
  isRootComment: boolean,
  options?: { skipEmbedding?: boolean }
) {
  const text = extractText(comment)
  if (!text.trim()) {
    return
  }

  await ensureCollectionsOnce()

  const doc: Record<string, unknown> = {
    id: comment.id,
    postId: comment.postId,
    owner,
    repo,
    authorId: comment.authorId,
    text,
    isRootComment,
    createdAt: comment.createdAt,
  }

  if (!options?.skipEmbedding) {
    try {
      const { embedding } = await embed({
        model: "openai/text-embedding-3-small",
        value: text.slice(0, 8000),
      })
      doc.embedding = embedding
    } catch (err) {
      console.error("Failed to generate embedding:", err)
    }
  }

  await typesense.collections(COMMENTS_COLLECTION).documents().upsert(doc)
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

export type RepoSearchResult = {
  name: string
  owner: string
  repo: string
  posts: number
  lastActive: number
  highlight?: string
}

export async function indexAllRepos(): Promise<number> {
  await ensureCollectionsOnce()

  const { posts, comments } = await import("./db/schema")
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

  if (repoStats.length === 0) {
    return 0
  }

  const documents = repoStats.map((r) => ({
    id: `${r.owner}/${r.repo}`,
    name: `${r.owner}/${r.repo}`,
    owner: r.owner,
    repo: r.repo,
    posts: r.postCount,
    lastActive: Number(r.lastActive) || Date.now(),
  }))

  await typesense
    .collections(REPOS_COLLECTION)
    .documents()
    .import(documents, { action: "upsert" })

  return documents.length
}

export async function indexRepo(owner: string, repo: string): Promise<void> {
  await ensureCollectionsOnce()

  const { posts, comments } = await import("./db/schema")
  const repoStats = await db
    .select({
      postCount: sql<number>`count(distinct ${posts.id})::int`,
      lastActive: sql<number>`greatest(max(${posts.updatedAt}), coalesce(max(${comments.updatedAt}), 0))`,
    })
    .from(posts)
    .leftJoin(comments, sql`${comments.postId} = ${posts.id}`)
    .where(sql`${posts.owner} = ${owner} AND ${posts.repo} = ${repo}`)

  if (repoStats.length === 0 || repoStats[0].postCount === 0) {
    return
  }

  const name = `${owner}/${repo}`
  await typesense
    .collections(REPOS_COLLECTION)
    .documents()
    .upsert({
      id: name,
      name,
      owner,
      repo,
      posts: repoStats[0].postCount,
      lastActive: Number(repoStats[0].lastActive) || Date.now(),
    })
}

export async function searchRepos(query: string): Promise<RepoSearchResult[]> {
  if (!query || query.length < 1) {
    return []
  }

  const results = await typesense
    .collections(REPOS_COLLECTION)
    .documents()
    .search({
      q: query,
      query_by: "name,owner,repo",
      prefix: true,
      num_typos: 0,
      per_page: 20,
      highlight_full_fields: "name,owner,repo",
    })

  return (results.hits ?? []).map((hit) => {
    const doc = hit.document as {
      name: string
      owner: string
      repo: string
      posts: number
      lastActive: number
    }
    const hl = hit.highlight as
      | {
          name?: { snippet?: string }
          owner?: { snippet?: string }
          repo?: { snippet?: string }
        }
      | undefined
    // Prefer name snippet if it has highlights, otherwise construct from owner/repo
    const nameSnippet = hl?.name?.snippet
    const highlightedName = nameSnippet?.includes("<mark>")
      ? nameSnippet
      : `${hl?.owner?.snippet ?? doc.owner}/${hl?.repo?.snippet ?? doc.repo}`
    return {
      name: doc.name,
      owner: doc.owner,
      repo: doc.repo,
      posts: Number(doc.posts) || 0,
      lastActive: doc.lastActive,
      highlight: highlightedName,
    }
  })
}

export type PostSearchResult = {
  postId: string
  text: string
  highlight: string
  isRootComment: boolean
  score: number
}

export async function searchPostsText(
  query: string,
  owner: string,
  repo: string,
  options?: { perPage?: number }
): Promise<PostSearchResult[]> {
  if (!query?.trim()) {
    return []
  }

  await ensureCollectionsOnce()
  const perPage = options?.perPage ?? 20
  const filterBy = `owner:=${owner} && repo:=${repo}`

  const results = await typesense
    .collections(COMMENTS_COLLECTION)
    .documents()
    .search({
      q: query,
      query_by: "text",
      filter_by: filterBy,
      per_page: perPage,
      highlight_full_fields: "text",
      highlight_start_tag: "<mark>",
      highlight_end_tag: "</mark>",
    })

  return dedupeHits(results.hits ?? [])
}

export async function searchPostsSemantic(
  query: string,
  owner: string,
  repo: string,
  options?: { perPage?: number; excludePostIds?: string[] }
): Promise<PostSearchResult[]> {
  if (!query?.trim()) {
    return []
  }

  await ensureCollectionsOnce()
  const perPage = options?.perPage ?? 5
  const filterBy = `owner:=${owner} && repo:=${repo}`

  let embedding: number[]
  try {
    const result = await embed({
      model: "openai/text-embedding-3-small",
      value: query,
    })
    embedding = result.embedding
  } catch (err) {
    console.error("Failed to generate query embedding:", err)
    return []
  }

  const searchParams: Record<string, unknown> = {
    q: "*",
    filter_by: filterBy,
    per_page: perPage,
    vector_query: `embedding:([${embedding.join(",")}], k:${perPage * 2})`,
    highlight_full_fields: "text",
    highlight_start_tag: "<mark>",
    highlight_end_tag: "</mark>",
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const multiResults = await typesense.multiSearch.perform(
    { searches: [{ collection: COMMENTS_COLLECTION, ...searchParams }] },
    {}
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results = multiResults.results[0] as any

  const hits = dedupeHits(results.hits ?? [])

  if (options?.excludePostIds?.length) {
    const excluded = new Set(options.excludePostIds)
    return hits.filter((h) => !excluded.has(h.postId)).slice(0, perPage)
  }

  return hits.slice(0, perPage)
}

function dedupeHits(
  hits: Array<{
    document: unknown
    highlight?: unknown
    text_match_info?: { score?: string | number }
    vector_distance?: number
  }>
): PostSearchResult[] {
  const seen = new Set<string>()
  const dedupedHits: PostSearchResult[] = []

  for (const hit of hits) {
    const doc = hit.document as {
      id: string
      postId: string
      text: string
      isRootComment: boolean
    }
    if (seen.has(doc.postId)) continue
    seen.add(doc.postId)

    const hl = hit.highlight as { text?: { snippet?: string } } | undefined
    const vectorDistance = (hit as { vector_distance?: number }).vector_distance
    dedupedHits.push({
      postId: doc.postId,
      text: doc.text,
      highlight: hl?.text?.snippet ?? doc.text.slice(0, 200),
      isRootComment: doc.isRootComment,
      score: Number(hit.text_match_info?.score ?? 0) + (vectorDistance ?? 0),
    })
  }

  return dedupedHits
}

export async function searchPostsHybrid(
  query: string,
  owner: string,
  repo: string,
  options?: { perPage?: number }
): Promise<PostSearchResult[]> {
  if (!query?.trim()) {
    return []
  }

  await ensureCollectionsOnce()
  const perPage = options?.perPage ?? 20
  const filterBy = `owner:=${owner} && repo:=${repo}`

  let embedding: number[] | null = null
  try {
    const result = await embed({
      model: "openai/text-embedding-3-small",
      value: query,
    })
    embedding = result.embedding
  } catch (err) {
    console.error("Failed to generate query embedding:", err)
  }

  const searchParams: Record<string, unknown> = {
    q: query,
    query_by: "text",
    filter_by: filterBy,
    per_page: perPage,
    highlight_full_fields: "text",
    highlight_start_tag: "<mark>",
    highlight_end_tag: "</mark>",
  }

  if (embedding) {
    searchParams.vector_query = `embedding:([${embedding.join(",")}], k:${perPage})`
  }

  // Use multiSearch to avoid query string length limits with vector embeddings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const multiResults = await typesense.multiSearch.perform(
    { searches: [{ collection: COMMENTS_COLLECTION, ...searchParams }] },
    {}
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results = multiResults.results[0] as any

  return dedupeHits(results.hits ?? [])
}

export async function reindexCommentsWithoutEmbeddings(): Promise<{
  total: number
  reindexed: number
}> {
  await ensureCollectionsOnce()

  // Find comments in Typesense that don't have embeddings
  // We search for all docs and filter client-side since Typesense doesn't support "field is null"
  const { comments } = await import("./db/schema")
  let page = 1
  const perPage = 100
  let reindexed = 0
  let total = 0

  while (true) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await typesense
      .collections(COMMENTS_COLLECTION)
      .documents()
      .search({
        q: "*",
        query_by: "text",
        per_page: perPage,
        page,
        include_fields: "id,embedding",
      })

    const hits = results.hits ?? []
    if (hits.length === 0) break

    const idsWithoutEmbedding = hits
      .filter((hit) => {
        const doc = hit.document as { id: string; embedding?: number[] }
        return !doc.embedding || doc.embedding.length === 0
      })
      .map((hit) => (hit.document as { id: string }).id)

    total += hits.length

    if (idsWithoutEmbedding.length > 0) {
      const dbComments = await db
        .select()
        .from(comments)
        .where(inArray(comments.id, idsWithoutEmbedding))

      for (const comment of dbComments) {
        const { posts } = await import("./db/schema")
        const [post] = await db
          .select({
            owner: posts.owner,
            repo: posts.repo,
            rootCommentId: posts.rootCommentId,
          })
          .from(posts)
          .where(eq(posts.id, comment.postId))
          .limit(1)

        if (post) {
          await indexComment(
            comment,
            post.owner,
            post.repo,
            comment.id === post.rootCommentId
          )
          reindexed++
        }
      }
    }

    if (hits.length < perPage) break
    page++
  }

  return { total, reindexed }
}

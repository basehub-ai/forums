import { sql } from "drizzle-orm"
import { db } from "@/lib/db/client"
import { comments, posts } from "@/lib/db/schema"
import { reposNamespace } from "@/lib/turbopuffer"

export type RepoDocument = {
  id: number
  name: string
  owner: string
  repo: string
  posts: number
  lastActive: number
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

  if (repoStats.length === 0) {
    return 0
  }

  const rows = repoStats.map((r, i) => ({
    id: i + 1,
    name: `${r.owner}/${r.repo}`,
    owner: r.owner,
    repo: r.repo,
    posts: r.postCount,
    lastActive: Number(r.lastActive) || Date.now(),
  }))

  await reposNamespace.write({
    upsert_rows: rows,
    schema: {
      name: {
        type: "string",
        full_text_search: true,
      },
      owner: {
        type: "string",
      },
      repo: {
        type: "string",
      },
      posts: {
        type: "uint",
      },
      lastActive: {
        type: "uint",
      },
    },
  })

  return rows.length
}

export async function indexRepo(owner: string, repo: string): Promise<void> {
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
  const existingDocs = await reposNamespace.query({
    top_k: 1,
    filters: ["name", "Eq", name],
    include_attributes: ["id"],
  })

  const existingRows = existingDocs.rows ?? []
  const id =
    existingRows.length > 0 ? (existingRows[0].id as number) : Date.now()

  await reposNamespace.write({
    upsert_rows: [
      {
        id,
        name,
        owner,
        repo,
        posts: repoStats[0].postCount,
        lastActive: Number(repoStats[0].lastActive) || Date.now(),
      },
    ],
    schema: {
      name: {
        type: "string",
        full_text_search: true,
      },
      owner: {
        type: "string",
      },
      repo: {
        type: "string",
      },
      posts: {
        type: "uint",
      },
      lastActive: {
        type: "uint",
      },
    },
  })
}

export type SearchResult = {
  name: string
  owner: string
  repo: string
  posts: number
  lastActive: number
}

export async function searchRepos(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 2) {
    return []
  }

  const results = await reposNamespace.query({
    top_k: 20,
    rank_by: ["name", "BM25", query],
    include_attributes: ["name", "owner", "repo", "posts", "lastActive"],
  })

  return (results.rows ?? []).map((r) => ({
    name: r.name as string,
    owner: r.owner as string,
    repo: r.repo as string,
    posts: r.posts as number,
    lastActive: r.lastActive as number,
  }))
}

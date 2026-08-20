import { and, eq, inArray, sql } from "drizzle-orm"
import { db } from "@/lib/db/client"
import { comments, posts } from "@/lib/db/schema"
import {
  type PostSearchResult,
  searchPostsSemantic,
  searchPostsText,
} from "@/lib/typesense-index"

type PostWithHighlight = {
  id: string
  number: number
  title: string | null
  categoryId: string | null
  authorId: string
  authorUsername: string | null
  rootCommentId: string | null
  createdAt: number
  updatedAt: number
  pinned: boolean
  commentCount: number
  reactionCount: number
  highlight: string | null
}

async function enrichPosts(
  searchResults: PostSearchResult[],
  owner: string,
  repo: string
): Promise<PostWithHighlight[]> {
  if (searchResults.length === 0) return []

  const postIds = searchResults.map((r) => r.postId)

  const matchedPosts = await db
    .select({
      id: posts.id,
      number: posts.number,
      title: posts.title,
      categoryId: posts.categoryId,
      authorId: posts.authorId,
      authorUsername: comments.authorUsername,
      rootCommentId: posts.rootCommentId,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      pinned: posts.pinned,
      commentCount: sql<number>`(
        SELECT COUNT(*) FROM comments WHERE comments.post_id = ${posts.id}
      )`.as("comment_count"),
      reactionCount: sql<number>`(
        SELECT COUNT(*) FROM reactions
        WHERE reactions.comment_id = ${posts.rootCommentId}
      )`.as("reaction_count"),
    })
    .from(posts)
    .leftJoin(comments, eq(posts.rootCommentId, comments.id))
    .where(
      and(
        eq(posts.owner, owner),
        eq(posts.repo, repo),
        inArray(posts.id, postIds)
      )
    )

  const postsById = Object.fromEntries(matchedPosts.map((p) => [p.id, p]))
  const highlightsByPostId = Object.fromEntries(
    searchResults.map((r) => [r.postId, r.highlight])
  )

  return postIds
    .map((id) => postsById[id])
    .filter(Boolean)
    .map((post) => ({
      ...post,
      highlight: highlightsByPostId[post.id] ?? null,
    }))
}

export async function POST(request: Request) {
  const body = await request.json()
  const { query, owner, repo, type, categoryId } = body as {
    query: string
    owner: string
    repo: string
    type: "text" | "semantic"
    categoryId?: string
  }

  if (!query?.trim()) {
    return Response.json({ posts: [] })
  }

  try {
    if (type === "text") {
      const textResults = await searchPostsText(query, owner, repo, {
        perPage: 20,
        categoryId,
      })
      const textPosts = await enrichPosts(textResults, owner, repo)
      return Response.json({ posts: textPosts })
    }

    if (type === "semantic") {
      const semanticResults = await searchPostsSemantic(query, owner, repo, {
        perPage: 5,
        categoryId,
      })
      const semanticPosts = await enrichPosts(semanticResults, owner, repo)
      return Response.json({ posts: semanticPosts })
    }

    return Response.json({ posts: [] })
  } catch (error) {
    console.error("Hybrid search error:", error)
    return Response.json(
      { posts: [], error: "Search failed" },
      { status: 500 }
    )
  }
}

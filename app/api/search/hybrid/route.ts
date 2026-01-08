import { and, eq, inArray, sql } from "drizzle-orm"
import { db } from "@/lib/db/client"
import { comments, posts } from "@/lib/db/schema"
import { searchPostsHybrid } from "@/lib/typesense-index"

export async function POST(request: Request) {
  const body = await request.json()
  const {
    query,
    owner,
    repo,
    perPage = 20,
  } = body as {
    query: string
    owner: string
    repo: string
    perPage?: number
  }

  if (!query?.trim()) {
    return Response.json({ posts: [], totalFound: 0 })
  }

  const searchResults = await searchPostsHybrid(query, owner, repo, { perPage })

  if (searchResults.length === 0) {
    return Response.json({ posts: [], totalFound: 0 })
  }

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

  const orderedPosts = postIds
    .map((id) => postsById[id])
    .filter(Boolean)
    .map((post) => ({
      ...post,
      highlight: highlightsByPostId[post.id] ?? null,
    }))

  return Response.json({
    posts: orderedPosts,
    totalFound: searchResults.length,
  })
}

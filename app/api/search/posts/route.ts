import { and, eq, inArray } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { comments, posts } from "@/lib/db/schema"
import { typesense } from "@/lib/typesense"

export type PostSearchResult = {
  postId: string
  postNumber: number
  title: string | null
  commentId: string
  isRootComment: boolean
  snippet: string
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")?.trim()
  const owner = searchParams.get("owner")
  const repo = searchParams.get("repo")
  const categoryId = searchParams.get("categoryId")

  if (!query || query.length < 2 || !owner || !repo) {
    return NextResponse.json({ results: [] })
  }

  let filterBy = `owner:=${owner} && repo:=${repo}`
  if (categoryId) {
    filterBy += ` && categoryId:=${categoryId}`
  }

  try {
    const searchResult = await typesense
      .collections("comments")
      .documents()
      .search({
        q: query,
        query_by: "text",
        filter_by: filterBy,
        group_by: ["postId"],
        group_limit: 1,
        per_page: 8,
        highlight_full_fields: "text",
        highlight_start_tag: "<mark>",
        highlight_end_tag: "</mark>",
        snippet_threshold: 30,
      })

    const groupedHits = searchResult.grouped_hits ?? []
    if (groupedHits.length === 0) {
      return NextResponse.json({ results: [] })
    }

    type CommentDocument = { id: string; isRootComment: boolean }
    const postIds = groupedHits.map((g) => g.group_key[0] as string)
    const commentIds = groupedHits
      .map((g) => (g.hits[0]?.document as CommentDocument | undefined)?.id)
      .filter((id): id is string => typeof id === "string")

    const [matchedPosts, matchedComments] = await Promise.all([
      db
        .select({
          id: posts.id,
          number: posts.number,
          title: posts.title,
          categoryId: posts.categoryId,
        })
        .from(posts)
        .where(
          and(
            eq(posts.owner, owner),
            eq(posts.repo, repo),
            inArray(posts.id, postIds)
          )
        ),
      db
        .select({
          id: comments.id,
          postId: comments.postId,
          threadCommentId: comments.threadCommentId,
        })
        .from(comments)
        .where(inArray(comments.id, commentIds)),
    ])

    const postsById = Object.fromEntries(matchedPosts.map((p) => [p.id, p]))
    const commentsById = Object.fromEntries(
      matchedComments.map((c) => [c.id, c])
    )

    const results: PostSearchResult[] = []
    for (const group of groupedHits) {
      const postId = group.group_key[0] as string
      const hit = group.hits[0]
      if (!hit) continue

      const post = postsById[postId]
      if (!post) continue

      const commentDoc = hit.document as { id: string; isRootComment: boolean }
      const commentData = commentsById[commentDoc.id]
      const isRootComment =
        commentDoc.isRootComment || commentData?.threadCommentId === null

      // Get highlighted snippet from Typesense
      const highlight = hit.highlight as Record<
        string,
        { snippet?: string; value?: string }
      >
      let snippet = ""
      if (highlight?.text?.snippet) {
        snippet = highlight.text.snippet
      } else if (highlight?.text?.value) {
        // Take first 100 chars of highlighted value
        snippet =
          highlight.text.value.length > 100
            ? highlight.text.value.slice(0, 100) + "..."
            : highlight.text.value
      }

      results.push({
        postId,
        postNumber: post.number,
        title: post.title,
        commentId: commentDoc.id,
        isRootComment,
        snippet,
      })
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error("Post search error:", error)
    return NextResponse.json({ results: [] })
  }
}

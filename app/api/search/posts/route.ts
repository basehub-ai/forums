import { type NextRequest, NextResponse } from "next/server"
import { typesense } from "@/lib/typesense"

export type PostSearchResult = {
  postId: string
  postNumber: number
  title: string
  commentId: string
  isRootComment: boolean
  snippet: string
}

type CommentDocument = {
  id: string
  postId: string
  postNumber: number
  postTitle: string
  isRootComment: boolean
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
        query_by: "postTitle,text",
        filter_by: filterBy,
        group_by: ["postId"],
        group_limit: 1,
        per_page: 8,
        highlight_full_fields: "postTitle,text",
        highlight_start_tag: "<mark>",
        highlight_end_tag: "</mark>",
        snippet_threshold: 30,
      })

    const groupedHits = searchResult.grouped_hits ?? []
    if (groupedHits.length === 0) {
      return NextResponse.json({ results: [] })
    }

    const results: PostSearchResult[] = []
    for (const group of groupedHits) {
      const hit = group.hits[0]
      if (!hit) continue

      const doc = hit.document as CommentDocument
      const highlight = hit.highlight as Record<
        string,
        { snippet?: string; value?: string }
      >

      // Prefer title highlight, fall back to text highlight
      let snippet = ""
      if (highlight?.postTitle?.snippet) {
        snippet = highlight.postTitle.snippet
      } else if (highlight?.postTitle?.value) {
        snippet = highlight.postTitle.value
      } else if (highlight?.text?.snippet) {
        snippet = highlight.text.snippet
      } else if (highlight?.text?.value) {
        snippet =
          highlight.text.value.length > 100
            ? highlight.text.value.slice(0, 100) + "..."
            : highlight.text.value
      }

      results.push({
        postId: doc.postId,
        postNumber: doc.postNumber,
        title: doc.postTitle || `Post #${doc.postNumber}`,
        commentId: doc.id,
        isRootComment: doc.isRootComment,
        snippet,
      })
    }

    return NextResponse.json({ results })
  } catch (error) {
    console.error("Post search error:", error)
    return NextResponse.json({ results: [] })
  }
}

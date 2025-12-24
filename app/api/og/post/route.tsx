import { ImageResponse } from "next/og"
import { NextRequest } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db/client"
import { categories, posts } from "@/lib/db/schema"

export const runtime = "edge"

const size = {
  width: 1200,
  height: 630,
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const owner = searchParams.get("owner")
  const repo = searchParams.get("repo")
  const postNumberStr = searchParams.get("postNumber")

  if (!owner || !repo || !postNumberStr) {
    return new Response("Missing parameters", { status: 400 })
  }

  const postNumber = Number.parseInt(postNumberStr, 10)

  const postWithCategory = await db
    .select({
      title: posts.title,
      number: posts.number,
      categoryTitle: categories.title,
      categoryEmoji: categories.emoji,
    })
    .from(posts)
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .where(
      and(
        eq(posts.owner, owner),
        eq(posts.repo, repo),
        eq(posts.number, postNumber)
      )
    )
    .limit(1)
    .then((r) => r[0])

  const title = postWithCategory?.title || `Post #${postNumber}`
  const category = postWithCategory?.categoryEmoji
    ? `${postWithCategory.categoryEmoji} ${postWithCategory.categoryTitle}`
    : null

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          backgroundColor: "#09090b",
          padding: 60,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div
            style={{
              fontSize: 28,
              color: "#71717a",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            {owner}/{repo} #{postNumber}
          </div>
          <div
            style={{
              fontSize: 56,
              fontWeight: "bold",
              color: "#fafafa",
              lineHeight: 1.2,
              maxWidth: 1080,
            }}
          >
            {title}
          </div>
        </div>
        {category && (
          <div
            style={{
              fontSize: 32,
              color: "#a1a1aa",
            }}
          >
            {category}
          </div>
        )}
      </div>
    ),
    {
      ...size,
    }
  )
}

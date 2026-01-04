import { and, eq } from "drizzle-orm"
import { ImageResponse } from "next/og"
import type { NextRequest } from "next/server"
import { getRootCommentText } from "@/lib/data/posts"
import { db } from "@/lib/db/client"
import { posts } from "@/lib/db/schema"
import { getSiteOrigin } from "@/lib/utils"

const size = {
  width: 1200,
  height: 630,
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const owner = searchParams.get("owner")
  const repo = searchParams.get("repo")
  const postNumberStr = searchParams.get("postNumber")

  if (!(owner && repo && postNumberStr)) {
    return new Response("Missing parameters", { status: 400 })
  }

  const postNumber = Number.parseInt(postNumberStr, 10)

  if (Number.isNaN(postNumber)) {
    return new Response("Invalid post number", { status: 400 })
  }

  const post = await db
    .select({
      title: posts.title,
      number: posts.number,
      rootCommentId: posts.rootCommentId,
    })
    .from(posts)
    .where(
      and(
        eq(posts.owner, owner),
        eq(posts.repo, repo),
        eq(posts.number, postNumber)
      )
    )
    .limit(1)
    .then((r) => r[0])

  const title = post?.title || `Post #${postNumber}`
  const body = post?.rootCommentId
    ? await getRootCommentText(post.rootCommentId)
    : null

  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        backgroundColor: "#fafafa",
        padding: 60,
        gap: 32,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt="Forums"
          height={56}
          src={`${getSiteOrigin()}/icon.svg`}
          width={56}
        />
        <span
          style={{
            fontSize: 36,
            fontWeight: 600,
            color: "#52525b",
            textTransform: "uppercase",
          }}
        >
          Forums
        </span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <div
          style={{
            fontSize: 36,
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
            fontSize: 64,
            fontWeight: "bold",
            color: "#09090b",
            lineHeight: 1.2,
            maxWidth: 1080,
          }}
        >
          {title}
        </div>
        {body && (
          <div
            style={{
              fontSize: 36,
              color: "#52525b",
              lineHeight: 1.5,
              maxWidth: 1080,
              display: "block",
              lineClamp: 3,
            }}
          >
            {body}
          </div>
        )}
      </div>
    </div>,
    {
      ...size,
    }
  )
}

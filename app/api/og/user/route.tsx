import { ImageResponse } from "next/og"
import { NextRequest } from "next/server"
import { eq, sql } from "drizzle-orm"
import { gitHubUserLoader } from "@/lib/auth"
import { db } from "@/lib/db/client"
import { comments } from "@/lib/db/schema"

const size = {
  width: 1200,
  height: 630,
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const username = searchParams.get("username")

  if (!username) {
    return new Response("Missing username parameter", { status: 400 })
  }

  const [user, totalComments] = await Promise.all([
    gitHubUserLoader.load(username),
    db
      .select({ count: sql<number>`count(*)` })
      .from(comments)
      .where(eq(comments.authorUsername, username))
      .then((r) => r[0]?.count ?? 0),
  ])

  const name = user?.name || username

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
              fontSize: 72,
              fontWeight: "bold",
              color: "#fafafa",
              lineHeight: 1.2,
            }}
          >
            {name}
          </div>
          <div
            style={{
              fontSize: 32,
              color: "#a1a1aa",
            }}
          >
            @{username}
          </div>
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#71717a",
          }}
        >
          {totalComments} comments
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}

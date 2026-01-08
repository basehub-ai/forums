import { eq, sql } from "drizzle-orm"
import { readFile } from "fs/promises"
import { ImageResponse } from "next/og"
import type { NextRequest } from "next/server"
import { join } from "path"
import { gitHubUserLoader } from "@/lib/auth"
import { db } from "@/lib/db/client"
import { comments } from "@/lib/db/schema"
import { getSiteOrigin } from "@/lib/utils"

const size = {
  width: 1200,
  height: 630,
}

const geistMonoRegular = readFile(
  join(
    process.cwd(),
    "node_modules/geist/dist/fonts/geist-mono/GeistMono-Regular.ttf"
  )
)
const geistMonoBold = readFile(
  join(
    process.cwd(),
    "node_modules/geist/dist/fonts/geist-mono/GeistMono-Bold.ttf"
  )
)

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const username = searchParams.get("username")

  if (!username) {
    return new Response("Missing username parameter", { status: 400 })
  }

  const [user, totalComments, fontRegular, fontBold] = await Promise.all([
    gitHubUserLoader.load(username),
    db
      .select({ count: sql<number>`count(*)` })
      .from(comments)
      .where(eq(comments.authorUsername, username))
      .then((r) => r[0]?.count ?? 0),
    geistMonoRegular,
    geistMonoBold,
  ])

  const name = user?.name || username

  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "space-between",
        backgroundColor: "#fafafa",
        padding: 60,
        fontFamily: "Geist Mono",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <img
          alt="Forums"
          height={40}
          src={`${getSiteOrigin()}/icon.svg`}
          width={40}
        />
        <span
          style={{
            display: "flex",
            fontSize: 36,
          }}
        >
          <span style={{ color: "#040404", fontWeight: 500 }}>FORUMS</span>
          <span style={{ color: "#71717a" }}>&nbsp;by BaseHub</span>
        </span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 40,
        }}
      >
        {user?.image && (
          <img
            alt={name}
            height={180}
            src={user.image}
            style={{ borderRadius: 90 }}
            width={180}
          />
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: "bold",
              color: "#09090b",
              lineHeight: 1.1,
            }}
          >
            {name}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              fontSize: 32,
              color: "#71717a",
            }}
          >
            <span>{`@${username}`}</span>
            <span>-</span>
            <span>{`${totalComments} comments`}</span>
          </div>
        </div>
      </div>
      <div style={{ display: "flex" }} />
    </div>,
    {
      ...size,
      fonts: [
        {
          name: "Geist Mono",
          data: fontRegular,
          weight: 400,
        },
        {
          name: "Geist Mono",
          data: fontBold,
          weight: 700,
        },
      ],
    }
  )
}

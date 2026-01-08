import { and, eq, sql } from "drizzle-orm"
import { readFile } from "fs/promises"
import { ImageResponse } from "next/og"
import type { NextRequest } from "next/server"
import { join } from "path"
import { githubFetch } from "@/lib/data/github"
import { db } from "@/lib/db/client"
import { posts } from "@/lib/db/schema"
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

interface GitHubRepoData {
  description: string | null
  [key: string]: unknown
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const owner = searchParams.get("owner")
  const repo = searchParams.get("repo")

  if (!(owner && repo)) {
    return new Response("Missing parameters", { status: 400 })
  }

  const [repoData, postCount, fontRegular, fontBold] = await Promise.all([
    githubFetch(`https://api.github.com/repos/${owner}/${repo}`).then((res) =>
      res.ok ? res.json() : null
    ) as Promise<GitHubRepoData | null>,
    db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(and(eq(posts.owner, owner), eq(posts.repo, repo)))
      .then((r) => r[0]?.count ?? 0),
    geistMonoRegular,
    geistMonoBold,
  ])

  const description = repoData?.description || "Forum discussions"

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
          flexDirection: "column",
          gap: 16,
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
          {`${owner}/${repo}`}
        </div>
        <div
          style={{
            fontSize: 48,
            color: "#71717a",
            maxWidth: 1080,
            lineHeight: 1.4,
          }}
        >
          {description}
        </div>
      </div>
      <div
        style={{
          fontSize: 48,
          color: "#71717a",
        }}
      >
        {`${postCount} posts`}
      </div>
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

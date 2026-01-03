import { ImageResponse } from "next/og"
import type { NextRequest } from "next/server"

const size = {
  width: 1200,
  height: 630,
}

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

  const repoData = (await fetch(
    `https://api.github.com/repos/${owner}/${repo}`,
    {
      headers: {
        ...(process.env.GITHUB_TOKEN && {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        }),
      },
    }
  ).then((res) => (res.ok ? res.json() : null))) as GitHubRepoData | null

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
          {owner}/{repo}
        </div>
        <div
          style={{
            fontSize: 32,
            color: "#a1a1aa",
            maxWidth: 1080,
          }}
        >
          {description}
        </div>
      </div>
      <div
        style={{
          fontSize: 28,
          color: "#71717a",
        }}
      >
        Forum
      </div>
    </div>,
    {
      ...size,
    }
  )
}

import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "Repository"
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = "image/png"

export default async function Image({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>
}) {
  const { owner, repo } = await params

  const repoData = await fetch(
    `https://api.github.com/repos/${owner}/${repo}`
  ).then((res) => (res.ok ? res.json() : null))

  const description = repoData?.description || "Forum discussions"

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
      </div>
    ),
    {
      ...size,
    }
  )
}

import { githubFetch } from "@/lib/github-fetch"

/**
 * Server-side proxy for GitHub search to use authenticated requests (5000 req/hour)
 * instead of unauthenticated client-side calls (60 req/hour per IP).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")?.trim()

  if (!query || query.length < 1) {
    return Response.json({ results: [] })
  }

  try {
    const res = await githubFetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=10`
    )

    if (!res.ok) {
      return Response.json({ results: [] })
    }

    const data = (await res.json()) as {
      items?: Array<{
        full_name: string
        owner: { login: string }
        name: string
      }>
    }

    const results = (data.items ?? []).map((repo) => ({
      name: repo.full_name,
      owner: repo.owner.login,
      repo: repo.name,
      posts: 0,
      lastActive: 0,
      isIndexed: false,
    }))

    return Response.json({ results })
  } catch (error) {
    console.error("GitHub search error:", error)
    return Response.json({ results: [] })
  }
}

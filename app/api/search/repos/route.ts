import { searchRepos } from "@/lib/turbopuffer-index"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")?.trim()

  if (!query || query.length < 2) {
    return Response.json({ results: [] })
  }

  try {
    const results = await searchRepos(query)
    return Response.json({ results })
  } catch (error) {
    console.error("Turbopuffer search error:", error)
    return Response.json(
      { results: [], error: "Search failed" },
      { status: 500 }
    )
  }
}

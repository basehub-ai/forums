import { ilike, or, sql } from "drizzle-orm"
import { db } from "@/lib/db/client"
import { posts } from "@/lib/db/schema"

type GitHubRepo = {
  id: number
  full_name: string
  description: string | null
  stargazers_count: number
  html_url: string
  owner: { login: string; avatar_url: string }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")?.trim()

  if (!query || query.length < 2) {
    return Response.json({ posts: [], repos: [] })
  }

  const [postsResult, reposResult] = await Promise.all([
    db
      .select({
        id: posts.id,
        number: posts.number,
        owner: posts.owner,
        repo: posts.repo,
        title: posts.title,
        createdAt: posts.createdAt,
        commentCount: sql<number>`(
          SELECT COUNT(*) FROM comments WHERE comments.post_id = ${posts.id}
        )`.as("comment_count"),
      })
      .from(posts)
      .where(
        or(
          ilike(posts.title, `%${query}%`),
          ilike(posts.owner, `%${query}%`),
          ilike(posts.repo, `%${query}%`)
        )
      )
      .limit(5),

    fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=5`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          ...(process.env.GITHUB_TOKEN && {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          }),
        },
      }
    )
      .then(async (res) => {
        if (!res.ok) return []
        const data = await res.json()
        return (data.items ?? []).map((repo: GitHubRepo) => ({
          id: repo.id,
          fullName: repo.full_name,
          description: repo.description,
          stars: repo.stargazers_count,
          url: repo.html_url,
          owner: repo.owner.login,
          ownerAvatar: repo.owner.avatar_url,
        }))
      })
      .catch(() => []),
  ])

  return Response.json({
    posts: postsResult,
    repos: reposResult,
  })
}

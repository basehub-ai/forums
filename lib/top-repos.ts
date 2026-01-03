import { sql } from "drizzle-orm"
import { cacheLife } from "next/cache"
import { db } from "@/lib/db/client"
import { comments, posts } from "@/lib/db/schema"

type RepoStats = {
  name: string
  stars: number
  posts: number
  lastActive: number
}

async function fetchRepoStars(repos: string[]): Promise<Map<string, number>> {
  const starMap = new Map<string, number>()

  await Promise.all(
    repos.map(async (repo) => {
      try {
        const res = await fetch(`https://api.github.com/repos/${repo}`, {
          headers: {
            Accept: "application/vnd.github.v3+json",
            ...(process.env.GITHUB_TOKEN && {
              Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
            }),
          },
          next: { revalidate: 3600 },
        })
        if (res.ok) {
          const data = (await res.json()) as { stargazers_count?: number }
          starMap.set(repo, data.stargazers_count ?? 0)
        }
      } catch {
        starMap.set(repo, 0)
      }
    })
  )

  return starMap
}

export async function getTopRepositories(limit = 10): Promise<RepoStats[]> {
  "use cache"
  cacheLife("minutes")

  const repoStats = await db
    .select({
      owner: posts.owner,
      repo: posts.repo,
      postCount: sql<number>`count(distinct ${posts.id})::int`,
      lastActive: sql<number>`greatest(max(${posts.updatedAt}), coalesce(max(${comments.updatedAt}), 0))`,
    })
    .from(posts)
    .leftJoin(comments, sql`${comments.postId} = ${posts.id}`)
    .groupBy(posts.owner, posts.repo)

  if (repoStats.length === 0) {
    return []
  }

  const repoNames = repoStats.map((r) => `${r.owner}/${r.repo}`)
  const starMap = await fetchRepoStars(repoNames)

  const results: RepoStats[] = repoStats.map((r) => {
    const name = `${r.owner}/${r.repo}`
    const lastActive = Number(r.lastActive) || Date.now()
    return {
      name,
      stars: starMap.get(name) ?? 0,
      posts: r.postCount,
      lastActive,
    }
  })

  results.sort((a, b) => {
    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000

    const recencyA = Math.max(0, 1 - (now - a.lastActive) / (30 * dayMs))
    const recencyB = Math.max(0, 1 - (now - b.lastActive) / (30 * dayMs))

    const scoreA =
      a.posts * 0.4 + recencyA * 0.3 + Math.log10(a.stars + 1) * 0.3
    const scoreB =
      b.posts * 0.4 + recencyB * 0.3 + Math.log10(b.stars + 1) * 0.3

    return scoreB - scoreA
  })

  return results.slice(0, limit)
}

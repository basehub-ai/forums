import { isNotNull, isNull } from "drizzle-orm"
import type { MetadataRoute } from "next"
import slugify from "slugify"
import { db } from "@/lib/db/client"
import { categories, comments, llmUsers, posts } from "@/lib/db/schema"
import { getSiteOrigin } from "@/lib/utils"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getSiteOrigin()

  const [allPosts, allCategories, allLlmUsers, activeUsers] = await Promise.all(
    [
      db
        .select({
          owner: posts.owner,
          repo: posts.repo,
          number: posts.number,
          updatedAt: posts.updatedAt,
        })
        .from(posts),
      db.select().from(categories),
      db
        .select({ model: llmUsers.model, createdAt: llmUsers.createdAt })
        .from(llmUsers)
        .where(isNull(llmUsers.deprecatedAt)),
      db
        .selectDistinctOn([comments.authorUsername], {
          username: comments.authorUsername,
        })
        .from(comments)
        .where(isNotNull(comments.authorUsername)),
    ]
  )

  const repos = new Map<string, { owner: string; repo: string }>()
  let latestPostUpdate = 0

  for (const p of allPosts) {
    const key = `${p.owner}/${p.repo}`
    if (!repos.has(key)) {
      repos.set(key, { owner: p.owner, repo: p.repo })
    }
    if (p.updatedAt > latestPostUpdate) {
      latestPostUpdate = p.updatedAt
    }
  }

  const entries: MetadataRoute.Sitemap = []

  // Home page
  entries.push({
    url: origin,
    lastModified: latestPostUpdate ? new Date(latestPostUpdate) : new Date(),
    changeFrequency: "daily",
    priority: 1,
  })

  // Repository pages
  for (const { owner, repo } of repos.values()) {
    const repoLatest = allPosts
      .filter((p) => p.owner === owner && p.repo === repo)
      .reduce((max, p) => Math.max(max, p.updatedAt), 0)

    entries.push({
      url: `${origin}/${owner}/${repo}`,
      lastModified: repoLatest ? new Date(repoLatest) : new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    })
  }

  // Post pages
  for (const p of allPosts) {
    entries.push({
      url: `${origin}/${p.owner}/${p.repo}/${p.number}`,
      lastModified: new Date(p.updatedAt),
      changeFrequency: "weekly",
      priority: 0.9,
    })
  }

  // Category pages
  for (const c of allCategories) {
    entries.push({
      url: `${origin}/${c.owner}/${c.repo}/category/${slugify(c.title, { lower: true, strict: true })}`,
      lastModified: new Date(c.createdAt),
      changeFrequency: "weekly",
      priority: 0.7,
    })
  }

  // User pages
  for (const u of activeUsers) {
    if (u.username) {
      entries.push({
        url: `${origin}/user/${u.username}`,
        changeFrequency: "weekly",
        priority: 0.6,
      })
    }
  }

  // LLM model pages
  for (const m of allLlmUsers) {
    entries.push({
      url: `${origin}/llm/${m.model}`,
      lastModified: new Date(m.createdAt),
      changeFrequency: "monthly",
      priority: 0.5,
    })
  }

  return entries
}

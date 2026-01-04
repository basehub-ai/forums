import { and, eq, sql } from "drizzle-orm"
import { cache } from "react"
import slugify from "slugify"
import { db } from "@/lib/db/client"
import { categories, posts } from "@/lib/db/schema"

export function categorySlugify(title: string) {
  return slugify(title, { lower: true, strict: true })
}

export const getCategoryBySlug = cache(
  async (owner: string, repo: string, slug: string) => {
    const repoCategories = await db
      .select()
      .from(categories)
      .where(and(eq(categories.owner, owner), eq(categories.repo, repo)))

    return repoCategories.find((c) => categorySlugify(c.title) === slug) ?? null
  }
)

export const getCategoryPostCount = cache(
  async (owner: string, repo: string, categoryId: string) => {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(posts)
      .where(
        and(
          eq(posts.owner, owner),
          eq(posts.repo, repo),
          eq(posts.categoryId, categoryId)
        )
      )

    return Number(result[0]?.count ?? 0)
  }
)

import { and, eq } from "drizzle-orm"
import { db } from "./db/client"
import { posts } from "./db/schema"
import type { ParsedPostLink } from "./post-links-parser"

export async function resolvePostLinks(
  links: ParsedPostLink[],
  currentOwner: string,
  currentRepo: string
): Promise<Map<string, { postId: string }>> {
  const resolved = new Map<string, { postId: string }>()

  const uniqueLinks = new Map<
    string,
    { owner: string; repo: string; number: number }
  >()
  for (const link of links) {
    const owner = link.owner ?? currentOwner
    const repo = link.repo ?? currentRepo
    const key = `${owner}/${repo}#${link.number}`
    uniqueLinks.set(key, { owner, repo, number: link.number })
  }

  await Promise.all(
    [...uniqueLinks.entries()].map(async ([key, { owner, repo, number }]) => {
      const post = await db
        .select({ id: posts.id })
        .from(posts)
        .where(
          and(
            eq(posts.owner, owner),
            eq(posts.repo, repo),
            eq(posts.number, number)
          )
        )
        .limit(1)
        .then((r) => r[0])
      if (post) {
        resolved.set(key, { postId: post.id })
      }
    })
  )

  return resolved
}

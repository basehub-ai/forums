import { sql } from "drizzle-orm"
import { redirect } from "next/navigation"
import { db } from "@/lib/db/client"
import { posts } from "@/lib/db/schema"

export async function GET() {
  const distinctRepos = db
    .selectDistinct({ owner: posts.owner, repo: posts.repo })
    .from(posts)
    .as("distinct_repos")

  const [random] = await db
    .select({ owner: distinctRepos.owner, repo: distinctRepos.repo })
    .from(distinctRepos)
    .orderBy(sql`random()`)
    .limit(1)

  if (!random) {
    redirect("/")
  }

  redirect(`/${random.owner}/${random.repo}`)
}

import { sql } from "drizzle-orm"
import { redirect } from "next/navigation"
import { db } from "@/lib/db/client"
import { posts } from "@/lib/db/schema"

export async function GET() {
  const [random] = await db
    .selectDistinct({ owner: posts.owner, repo: posts.repo })
    .from(posts)
    .orderBy(sql`random()`)
    .limit(1)

  if (!random) {
    redirect("/")
  }

  redirect(`/${random.owner}/${random.repo}`)
}

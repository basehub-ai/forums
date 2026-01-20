import { desc, eq } from "drizzle-orm"
import { db } from "@/lib/db/client"
import { comments, posts } from "@/lib/db/schema"

export async function getLatestPosts(limit = 5) {
  return db
    .select({
      id: posts.id,
      number: posts.number,
      title: posts.title,
      owner: posts.owner,
      repo: posts.repo,
      authorUsername: comments.authorUsername,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .leftJoin(comments, eq(posts.rootCommentId, comments.id))
    .orderBy(desc(posts.createdAt))
    .limit(limit)
}

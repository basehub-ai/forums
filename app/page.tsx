import { desc, sql } from "drizzle-orm"
import Link from "next/link"
import { GitHubRepoInput } from "@/components/github-repo-input"
import { db } from "@/lib/db/client"
import { posts } from "@/lib/db/schema"

export default async function Home() {
  "use cache"

  const allPosts = await db
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
      reactionCount: sql<number>`(
        SELECT COUNT(*) FROM reactions
        WHERE reactions.comment_id = ${posts.rootCommentId}
      )`.as("reaction_count"),
    })
    .from(posts)
    .orderBy(desc(posts.createdAt))
    .limit(20)

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="mb-12 flex flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="font-semibold text-3xl tracking-tight">
            Enter a GitHub repository
          </h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Paste a GitHub URL or type owner/repo
          </p>
        </div>
        <GitHubRepoInput />
      </div>

      {allPosts.length > 0 && (
        <div>
          <h2 className="mb-4 font-semibold text-xl">Featured Posts</h2>
          <div className="space-y-2">
            {allPosts.map((post) => (
              <Link
                className="block rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
                href={`/${post.owner}/${post.repo}/${post.number}`}
                key={post.id}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm">
                        {post.owner}/{post.repo}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        #{post.number}
                      </span>
                    </div>
                    <h3 className="font-medium">
                      {post.title || `Post #${post.number}`}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground text-sm">
                    {post.reactionCount > 0 && (
                      <span title="Reactions">👍 {post.reactionCount}</span>
                    )}
                    {post.commentCount > 1 && (
                      <span title="Comments">💬 {post.commentCount - 1}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

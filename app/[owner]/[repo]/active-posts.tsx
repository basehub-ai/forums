"use client"

import type { InferSelectModel } from "drizzle-orm"
import Link from "next/link"
import type { categories } from "@/lib/db/schema"

type PostListItem = {
  id: string
  number: number
  title: string | null
  categoryId: string | null
  authorId: string
  rootCommentId: string | null
  createdAt: number
  commentCount: number
  reactionCount: number
}

type Category = InferSelectModel<typeof categories>

export function ActivePosts({
  posts,
  owner,
  repo,
  categoriesById,
}: {
  posts: PostListItem[]
  owner: string
  repo: string
  categoriesById: Record<string, Category>
}) {
  if (posts.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No posts yet. Start a discussion!
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {posts.map((post) => {
        const category = post.categoryId
          ? categoriesById[post.categoryId]
          : null

        return (
          <Link
            className="block rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
            href={`/${owner}/${repo}/${post.number}`}
            key={post.id}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">
                    #{post.number}
                  </span>
                  {!!category && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                      {category.emoji} {category.title}
                    </span>
                  )}
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
        )
      })}
    </div>
  )
}

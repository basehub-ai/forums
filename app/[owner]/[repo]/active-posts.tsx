import type { InferSelectModel } from "drizzle-orm"
import { AsteriskIcon } from "lucide-react"
import Link from "next/link"
import { List, ListItem, TableCellText } from "@/components/typography"
import type { categories } from "@/lib/db/schema"
import { formatRelativeTime } from "@/lib/utils"
import { AuthorAvatar } from "./author-avatar"

type PostListItem = {
  id: string
  number: number
  title: string | null
  categoryId: string | null
  authorId: string
  authorUsername: string | null
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
    <div className="text-sm [--col-w-avatar:24px] [--col-w-initials:32px] [--col-w-time:120px]">
      <List className="gap-2">
        {posts.map((post) => (
          <ListItem key={post.id}>
            <Link
              className="group mr-3 flex grow items-center gap-1 text-dim hover:underline"
              href={`/${owner}/${repo}/${post.number}`}
            >
              <AsteriskIcon className="mt-0.5 text-faint" size={16} />
              <span className="truncate leading-none group-hover:text-bright">
                {post.title || `Post #${post.number}`}
              </span>
            </Link>
            <div className="flex shrink-0 items-center">
              {!!post.authorUsername && (
                <TableCellText className="relative mr-2 h-full w-(--col-w-avatar)">
                  <AuthorAvatar username={post.authorUsername} />
                </TableCellText>
              )}
              <TableCellText className="w-(--col-w-time) text-end">
                {formatRelativeTime(post.createdAt)}
              </TableCellText>
            </div>
          </ListItem>
        ))}
      </List>
    </div>
  )
}

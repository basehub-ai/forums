import type { InferSelectModel } from "drizzle-orm"
import { AsteriskIcon } from "lucide-react"
import Link from "next/link"
import { RelativeTime } from "@/components/relative-time"
import {
  List,
  ListItem,
  TableCellText,
  TableColumnTitle,
} from "@/components/typography"
import { UserAvatar } from "@/components/user-avatar"
import type { categories } from "@/lib/db/schema"

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
    return <p className="text-dim">No posts yet. Ask something!</p>
  }

  return (
    <div className="-mx-4 overflow-x-auto [--col-w-by:20px] [--col-w-created:140px] sm:-mx-2 sm:px-2">
      <div className="px-4 sm:px-0">
        <div className="relative min-w-120">
          <hr className="divider-md absolute top-1/2 left-0 w-full -translate-y-1/2 border-0" />
          <div className="relative z-10 flex w-full">
            <div className="flex grow">
              <TableColumnTitle className="px-0 pr-2">
                Latest Posts
              </TableColumnTitle>
            </div>
            <div className="flex shrink-0">
              <TableColumnTitle className="mr-17.5">OP</TableColumnTitle>
              <TableColumnTitle className="px-0 pl-2">Created</TableColumnTitle>
            </div>
          </div>
        </div>
        <List className="mt-2 min-w-120 pb-2">
          {posts.map((post) => {
            return (
              <ListItem key={post.id}>
                <Link
                  className="group mr-3 flex grow items-center gap-1 overflow-hidden text-dim hover:underline"
                  href={`/${owner}/${repo}/${post.number}`}
                >
                  <AsteriskIcon className="mt-0.5 text-faint" size={16} />
                  <span className="truncate leading-none group-hover:text-bright">
                    {post.title || `Post #${post.number}`}
                  </span>
                </Link>
                <div className="flex shrink-0 items-center">
                  <TableCellText className="w-(--col-w-by)">
                    {!!post.authorUsername && (
                      <Link href={`/user/${post.authorUsername}`}>
                        <UserAvatar username={post.authorUsername} />
                      </Link>
                    )}
                  </TableCellText>
                  <TableCellText className="w-(--col-w-created) text-end">
                    <RelativeTime timestamp={post.createdAt} />
                  </TableCellText>
                </div>
              </ListItem>
            )
          })}
        </List>
      </div>
    </div>
  )
}

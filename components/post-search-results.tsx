"use client"

import { AsteriskIcon } from "lucide-react"
import Link from "next/link"
import type { PostSearchResult } from "@/app/api/search/posts/route"
import { List, ListItem } from "@/components/typography"

export function PostSearchResults({
  results,
  owner,
  repo,
  isSearching,
  query,
}: {
  results: PostSearchResult[]
  owner: string
  repo: string
  isSearching: boolean
  query: string
}) {
  if (isSearching) {
    return (
      <div className="py-3 text-sm text-muted">Searching "{query}"...</div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="py-3 text-sm text-muted">
        No posts found for "{query}".
      </div>
    )
  }

  return (
    <List className="py-2">
      {results.map((result) => {
        const href = result.isRootComment
          ? `/${owner}/${repo}/${result.postNumber}`
          : `/${owner}/${repo}/${result.postNumber}#${result.commentId}`

        return (
          <ListItem key={result.postId}>
            <Link
              className="group flex w-full flex-col gap-0.5 overflow-hidden text-dim hover:text-bright"
              href={href}
            >
              <div className="flex items-center gap-1">
                <AsteriskIcon className="mt-0.5 shrink-0 text-faint" size={16} />
                <span className="truncate font-medium leading-none">
                  {result.title || `Post #${result.postNumber}`}
                </span>
              </div>
              {result.snippet && (
                <div
                  className="ml-5 truncate text-sm text-muted [&_mark]:bg-highlight-yellow [&_mark]:text-background"
                  dangerouslySetInnerHTML={{ __html: result.snippet }}
                />
              )}
            </Link>
          </ListItem>
        )
      })}
    </List>
  )
}

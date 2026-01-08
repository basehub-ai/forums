"use client"

import type { InferSelectModel } from "drizzle-orm"
import { AsteriskIcon } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { RelativeTime } from "@/components/relative-time"
import {
  List,
  ListItem,
  TableCellText,
  TableColumnTitle,
} from "@/components/typography"
import type { categories } from "@/lib/db/schema"
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

type SearchResult = PostListItem & {
  highlight: string | null
}

type Category = InferSelectModel<typeof categories>

type RepoPostsSectionProps = {
  posts: PostListItem[]
  owner: string
  repo: string
  categoriesById: Record<string, Category>
  searchQuery: string
}

export function RepoPostsSection({
  posts,
  owner,
  repo,
  searchQuery,
}: RepoPostsSectionProps) {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const prevQueryRef = useRef("")

  const search = useCallback(
    async (query: string) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      if (!query.trim()) {
        setSearchResults([])
        setIsSearching(false)
        return
      }

      const controller = new AbortController()
      abortControllerRef.current = controller
      setIsSearching(true)

      try {
        const res = await fetch("/api/search/hybrid", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, owner, repo }),
          signal: controller.signal,
        })
        const data = (await res.json()) as { posts?: SearchResult[] }
        if (!controller.signal.aborted) {
          setSearchResults(data.posts ?? [])
          setIsSearching(false)
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Search failed:", err)
          setIsSearching(false)
        }
      }
    },
    [owner, repo]
  )

  useEffect(() => {
    if (searchQuery === prevQueryRef.current) return
    prevQueryRef.current = searchQuery

    const timer = setTimeout(() => {
      search(searchQuery)
    }, 200)
    return () => clearTimeout(timer)
  }, [searchQuery, search])

  const hasSearchQuery = searchQuery.trim().length > 0

  if (hasSearchQuery) {
    return (
      <SearchResultsList
        isLoading={isSearching}
        owner={owner}
        query={searchQuery}
        repo={repo}
        results={searchResults}
      />
    )
  }

  return <LatestPosts owner={owner} posts={posts} repo={repo} />
}

function LatestPosts({
  posts,
  owner,
  repo,
}: {
  posts: PostListItem[]
  owner: string
  repo: string
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
          {posts.map((post) => (
            <ListItem key={post.id}>
              <Link
                className="group mr-3 flex grow items-center gap-1 overflow-hidden text-dim hover:underline"
                href={`/${owner}/${repo}/${post.number}`}
              >
                <AsteriskIcon
                  className="mt-0.5 shrink-0 text-faint"
                  size={16}
                />
                <span className="truncate leading-none group-hover:text-bright">
                  {post.title || `Post #${post.number}`}
                </span>
              </Link>
              <div className="flex shrink-0 items-center">
                <TableCellText className="w-(--col-w-by)">
                  {!!post.authorUsername && (
                    <AuthorAvatar username={post.authorUsername} />
                  )}
                </TableCellText>
                <TableCellText className="w-(--col-w-created) text-end">
                  <RelativeTime timestamp={post.createdAt} />
                </TableCellText>
              </div>
            </ListItem>
          ))}
        </List>
      </div>
    </div>
  )
}

function SearchResultsList({
  results,
  isLoading,
  owner,
  repo,
  query,
}: {
  results: SearchResult[]
  isLoading: boolean
  owner: string
  repo: string
  query: string
}) {
  if (isLoading && results.length === 0) {
    return <p className="text-dim text-sm">Searching...</p>
  }

  if (!isLoading && results.length === 0) {
    return (
      <p className="text-dim text-sm">No results for &ldquo;{query}&rdquo;</p>
    )
  }

  return (
    <div className="-mx-4 overflow-x-auto [--col-w-by:20px] [--col-w-created:140px] sm:-mx-2 sm:px-2">
      <div className="px-4 sm:px-0">
        <div className="relative min-w-120">
          <hr className="divider-md absolute top-1/2 left-0 w-full -translate-y-1/2 border-0" />
          <div className="relative z-10 flex w-full">
            <div className="flex grow">
              <TableColumnTitle className="px-0 pr-2">
                Search Results
              </TableColumnTitle>
            </div>
            <div className="flex shrink-0">
              <TableColumnTitle className="mr-17.5">OP</TableColumnTitle>
              <TableColumnTitle className="px-0 pl-2">Created</TableColumnTitle>
            </div>
          </div>
        </div>
        <List className="mt-2 min-w-120 pb-2">
          {results.map((post) => (
            <ListItem className="flex-col gap-0.5" key={post.id}>
              <div className="flex w-full">
                <Link
                  className="group mr-3 flex grow items-center gap-1 overflow-hidden text-dim hover:underline"
                  href={`/${owner}/${repo}/${post.number}`}
                >
                  <AsteriskIcon
                    className="mt-0.5 shrink-0 text-faint"
                    size={16}
                  />
                  <span className="truncate leading-none group-hover:text-bright">
                    {post.title || `Post #${post.number}`}
                  </span>
                </Link>
                <div className="flex shrink-0 items-center">
                  <TableCellText className="w-(--col-w-by)">
                    {!!post.authorUsername && (
                      <AuthorAvatar username={post.authorUsername} />
                    )}
                  </TableCellText>
                  <TableCellText className="w-(--col-w-created) text-end">
                    <RelativeTime timestamp={post.createdAt} />
                  </TableCellText>
                </div>
              </div>
              {post.highlight && (
                <div className="ml-5 line-clamp-1 text-faint text-xs">
                  <HighlightedText html={post.highlight} />
                </div>
              )}
            </ListItem>
          ))}
        </List>
      </div>
    </div>
  )
}

function HighlightedText({ html }: { html: string }) {
  const cleaned = html.replace(/\n/g, " ")
  return (
    <span
      className="[&_mark]:bg-transparent [&_mark]:font-medium [&_mark]:text-dim"
      dangerouslySetInnerHTML={{ __html: cleaned }}
    />
  )
}

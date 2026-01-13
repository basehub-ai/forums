"use client"

import type { InferSelectModel } from "drizzle-orm"
import { AsteriskIcon, SparklesIcon } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
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

type SearchResult = PostListItem & {
  highlight: string | null
}

type Category = InferSelectModel<typeof categories>

type RepoPostsSectionProps = {
  posts: PostListItem[]
  owner: string
  repo: string
  categoriesById: Record<string, Category>
  categoryId?: string
  searchQuery: string
}

export function RepoPostsSection({
  posts,
  owner,
  repo,
  categoryId,
  searchQuery,
}: RepoPostsSectionProps) {
  const [textResults, setTextResults] = useState<SearchResult[]>([])
  const [semanticResults, setSemanticResults] = useState<SearchResult[]>([])
  const [isTextSearching, setIsTextSearching] = useState(false)
  const [isSemanticSearching, setIsSemanticSearching] = useState(false)
  const textAbortRef = useRef<AbortController | null>(null)
  const semanticAbortRef = useRef<AbortController | null>(null)
  const prevQueryRef = useRef("")

  const searchText = useCallback(
    async (query: string) => {
      if (textAbortRef.current) {
        textAbortRef.current.abort()
      }

      if (!query.trim()) {
        setTextResults([])
        setIsTextSearching(false)
        return
      }

      const controller = new AbortController()
      textAbortRef.current = controller
      setIsTextSearching(true)

      try {
        const res = await fetch("/api/search/hybrid", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            owner,
            repo,
            type: "text",
            categoryId,
          }),
          signal: controller.signal,
        })
        const data = (await res.json()) as { posts?: SearchResult[] }
        if (!controller.signal.aborted) {
          setTextResults(data.posts ?? [])
          setIsTextSearching(false)
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Text search failed:", err)
          setIsTextSearching(false)
        }
      }
    },
    [owner, repo, categoryId]
  )

  const searchSemantic = useCallback(
    async (query: string) => {
      if (semanticAbortRef.current) {
        semanticAbortRef.current.abort()
      }

      if (!query.trim()) {
        setSemanticResults([])
        setIsSemanticSearching(false)
        return
      }

      const controller = new AbortController()
      semanticAbortRef.current = controller
      setIsSemanticSearching(true)

      try {
        const res = await fetch("/api/search/hybrid", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            owner,
            repo,
            type: "semantic",
            categoryId,
          }),
          signal: controller.signal,
        })
        const data = (await res.json()) as { posts?: SearchResult[] }
        if (!controller.signal.aborted) {
          setSemanticResults(data.posts ?? [])
          setIsSemanticSearching(false)
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Semantic search failed:", err)
          setIsSemanticSearching(false)
        }
      }
    },
    [owner, repo, categoryId]
  )

  useEffect(() => {
    if (searchQuery === prevQueryRef.current) {
      return
    }
    prevQueryRef.current = searchQuery

    if (posts.length === 0) {
      return
    }

    searchText(searchQuery)

    const semanticTimer = setTimeout(() => {
      searchSemantic(searchQuery)
    }, 300)

    return () => {
      clearTimeout(semanticTimer)
    }
  }, [searchQuery, searchText, searchSemantic, posts.length])

  const hasSearchQuery =
    searchQuery.trim().length > 0 && searchQuery.trim().length <= 150

  if (hasSearchQuery && posts.length > 0) {
    return (
      <div className="flex flex-col gap-8">
        <RelatedPostsSection
          isLoading={isSemanticSearching}
          owner={owner}
          repo={repo}
          results={semanticResults}
          textResultIds={new Set(textResults.map((r) => r.id))}
        />
        <TextSearchResults
          isLoading={isTextSearching}
          owner={owner}
          repo={repo}
          results={textResults}
        />
      </div>
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
          ))}
        </List>
      </div>
    </div>
  )
}

function RelatedPostsSection({
  results,
  isLoading,
  owner,
  repo,
  textResultIds,
}: {
  results: SearchResult[]
  isLoading: boolean
  owner: string
  repo: string
  textResultIds: Set<string>
}) {
  const filteredResults = results
    .filter((r) => !textResultIds.has(r.id))
    .slice(0, 2)

  return (
    <div className="h-[104px] border-muted border-l-2 border-dotted pl-4">
      <div className="mb-2 flex items-center gap-1.5 text-faint text-xs uppercase">
        <SparklesIcon className="h-3 w-3" />
        Related Posts
      </div>
      <div className="flex flex-col gap-1.5">
        {isLoading && filteredResults.length === 0 ? (
          <span className="text-faint text-sm">Finding related posts...</span>
        ) : filteredResults.length === 0 ? (
          <span className="text-faint text-sm">No related posts found</span>
        ) : (
          filteredResults.map((post) => (
            <Link
              className="group flex flex-col gap-0.5"
              href={`/${owner}/${repo}/${post.number}`}
              key={post.id}
            >
              <span className="text-dim text-sm group-hover:text-bright group-hover:underline">
                {post.title || `Post #${post.number}`}
              </span>
              {post.highlight && (
                <span className="line-clamp-1 text-faint text-xs">
                  <HighlightedText html={post.highlight} />
                </span>
              )}
            </Link>
          ))
        )}
      </div>
    </div>
  )
}

function TextSearchResults({
  results,
  isLoading,
  owner,
  repo,
}: {
  results: SearchResult[]
  isLoading: boolean
  owner: string
  repo: string
}) {
  if (isLoading && results.length === 0) {
    return <p className="text-dim text-sm">Searching...</p>
  }

  if (results.length === 0) {
    return <p className="text-dim text-sm">No results.</p>
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
                      <Link href={`/user/${post.authorUsername}`}>
                        <UserAvatar username={post.authorUsername} />
                      </Link>
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
      className="[&_mark]:bg-highlight-yellow [&_mark]:text-background"
      dangerouslySetInnerHTML={{ __html: cleaned }}
    />
  )
}

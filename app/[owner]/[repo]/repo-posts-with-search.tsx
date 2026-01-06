"use client"

import type { InferSelectModel } from "drizzle-orm"
import { AsteriskIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Composer, type ComposerProps } from "@/components/composer"
import { RelativeTime } from "@/components/relative-time"
import { List, ListItem, TableCellText } from "@/components/typography"
import { createPost } from "@/lib/actions/posts"
import type { categories } from "@/lib/db/schema"
import { usePostSearch } from "@/lib/hooks/use-post-search"
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

const PREFERRED_LLM_KEY = "preferred-llm"

export function RepoPostsWithSearch({
  posts,
  owner,
  repo,
  askingOptions,
  categoryId,
}: {
  posts: PostListItem[]
  owner: string
  repo: string
  categoriesById: Record<string, Category>
  askingOptions: ComposerProps["options"]["asking"]
  categoryId?: string
}) {
  const router = useRouter()
  const [defaultLlmId, setDefaultLlmId] = useState<string | undefined>()
  const { query, setQuery, results, isSearching, hasQuery } = usePostSearch({
    owner,
    repo,
    categoryId,
  })

  useEffect(() => {
    const saved = localStorage.getItem(PREFERRED_LLM_KEY)
    if (saved && askingOptions.some((a) => a.id === saved)) {
      setDefaultLlmId(saved)
    }
  }, [askingOptions])

  const showSearchResults = hasQuery

  return (
    <>
      <div className="mb-2">
        <Composer
          autoFocus
          defaultAskingId={defaultLlmId}
          onAskingChange={(asking) => {
            localStorage.setItem(PREFERRED_LLM_KEY, asking.id)
          }}
          onQueryChange={setQuery}
          onSubmit={async ({ value, options }) => {
            const result = await createPost({
              owner,
              repo,
              content: {
                id: crypto.randomUUID(),
                role: "user",
                parts: [{ type: "text", text: value }],
              },
              seekingAnswerFrom: options.asking.id,
            })
            router.push(`/${owner}/${repo}/${result.postNumber}`)
          }}
          options={{ asking: askingOptions }}
          placeholder="Ask or search"
          storageKey={`new-post-composer:${owner}:${repo}`}
        />
      </div>

      {showSearchResults ? (
        <SearchResults
          isSearching={isSearching}
          owner={owner}
          query={query}
          repo={repo}
          results={results}
        />
      ) : (
        <ActivePostsList owner={owner} posts={posts} repo={repo} />
      )}
    </>
  )
}

function SearchResults({
  results,
  owner,
  repo,
  isSearching,
  query,
}: {
  results: {
    postId: string
    postNumber: number
    title: string
    commentId: string
    isRootComment: boolean
    snippet: string
  }[]
  owner: string
  repo: string
  isSearching: boolean
  query: string
}) {
  if (isSearching) {
    return <p className="text-muted">Searching "{query}"...</p>
  }

  if (results.length === 0) {
    return <p className="text-muted">No posts found for "{query}".</p>
  }

  return (
    <div className="-mx-4 overflow-x-auto sm:-mx-2 sm:px-2">
      <div className="px-4 sm:px-0">
        <List className="mt-2 min-w-120 pb-2">
          {results.map((result) => {
            const href = result.isRootComment
              ? `/${owner}/${repo}/${result.postNumber}`
              : `/${owner}/${repo}/${result.postNumber}#comment-${result.commentId}`

            return (
              <ListItem key={result.postId}>
                <Link
                  className="group mr-3 flex grow flex-col gap-0.5 overflow-hidden text-dim hover:underline"
                  href={href}
                >
                  <div className="flex items-center gap-1">
                    <AsteriskIcon
                      className="mt-0.5 shrink-0 text-faint"
                      size={16}
                    />
                    <span className="truncate leading-none group-hover:text-bright">
                      {result.title}
                    </span>
                  </div>
                  {result.snippet && (
                    <div
                      className="ml-5 truncate text-muted text-sm [&_mark]:bg-highlight-yellow [&_mark]:text-background"
                      dangerouslySetInnerHTML={{ __html: result.snippet }}
                    />
                  )}
                </Link>
              </ListItem>
            )
          })}
        </List>
      </div>
    </div>
  )
}

function ActivePostsList({
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
    <div className="-mx-4 overflow-x-auto sm:-mx-2 sm:px-2">
      <div className="px-4 sm:px-0">
        <List className="mt-2 min-w-120 pb-2">
          {posts.map((post) => (
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
                {!!post.authorUsername && (
                  <TableCellText className="relative mr-2 h-full w-5">
                    <AuthorAvatar username={post.authorUsername} />
                  </TableCellText>
                )}
                <TableCellText className="text-end text-sm">
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

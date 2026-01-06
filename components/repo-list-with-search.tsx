"use client"

import { AsteriskIcon, SearchIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import {
  List,
  ListItem,
  TableCellText,
  TableColumnTitle,
} from "@/components/typography"
import { formatCompactNumber, formatRelativeTime } from "@/lib/utils"

type RepoStats = {
  name: string
  stars: number
  posts: number
  lastActive: number
}

type SearchResult = {
  name: string
  owner: string
  repo: string
  posts: number
  lastActive: number
}

function parseRepoInput(input: string): { owner: string; repo: string } | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const githubUrlMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/]+)/i
  )
  if (githubUrlMatch) {
    const [, owner, repo] = githubUrlMatch
    const cleanRepo = repo.replace(/\.git$/, "").split(/[?#]/)[0]
    return { owner, repo: cleanRepo }
  }

  const pathMatch = trimmed.match(/^\/?([^/]+)\/([^/]+)\/?$/)
  if (pathMatch) {
    const [, owner, repo] = pathMatch
    return { owner, repo }
  }

  return null
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query || query.length < 2) {
    return <>{text}</>
  }

  const parts = text.split(
    new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi")
  )

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <span className="bg-highlight-yellow text-background" key={i}>
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  )
}

export function RepoListWithSearch({
  topRepos,
  now,
}: {
  topRepos: RepoStats[]
  now: number
}) {
  const router = useRouter()
  const [value, setValue] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [displayedQuery, setDisplayedQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(
    null
  )
  const [isSearching, setIsSearching] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const query = value.trim()

    if (!query || query.length < 2) {
      setSearchResults(null)
      setSearchQuery("")
      setDisplayedQuery("")
      setIsSearching(false)
      return
    }

    const timer = setTimeout(() => {
      abortControllerRef.current?.abort()
      const controller = new AbortController()
      abortControllerRef.current = controller

      setIsSearching(true)
      setSearchQuery(query)

      fetch(`/api/search/repos?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then((res) => res.json() as Promise<{ results?: SearchResult[] }>)
        .then((data) => {
          if (!controller.signal.aborted) {
            setSearchResults(data.results ?? [])
            setDisplayedQuery(query)
            setIsSearching(false)
          }
        })
        .catch((err) => {
          if (err instanceof Error && err.name !== "AbortError") {
            setSearchResults([])
            setIsSearching(false)
          }
        })
    }, 200)

    return () => {
      clearTimeout(timer)
      abortControllerRef.current?.abort()
    }
  }, [value])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseRepoInput(value)
    if (parsed) {
      router.push(`/${parsed.owner}/${parsed.repo}`)
    }
  }

  const displayRepos =
    searchResults !== null
      ? searchResults
          .filter((r) =>
            r.name.toLowerCase().includes(displayedQuery.toLowerCase())
          )
          .map((r) => ({
            name: r.name,
            stars: 0,
            posts: r.posts,
            lastActive: r.lastActive,
          }))
      : topRepos

  const headerText = searchQuery
    ? `Searching "${searchQuery}"`
    : "Top Repositories"

  return (
    <>
      <form
        className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4"
        onSubmit={handleSubmit}
      >
        <div className="relative flex w-full items-center sm:w-sm">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-accent"
            size={18}
          />
          <input
            className="no-focus h-9 w-full bg-accent/5 pr-2 pl-8 font-medium text-accent text-base outline-dotted outline-2 outline-accent -outline-offset-1 placeholder:text-accent hover:bg-accent/10 focus:outline-dashed"
            onChange={(e) => setValue(e.target.value)}
            placeholder="Search or paste a repo URL"
            value={value}
          />
        </div>
        <div className="text-sm">
          <span className="text-faint">or </span>
          <Link
            className="text-muted hover:text-bright hover:underline"
            href="/lucky"
          >
            I'm feeling lucky
          </Link>
          .
        </div>
      </form>

      <div className="-mx-4 mt-10 overflow-x-auto [--col-w-1:89px] [--col-w-2:67px] [--col-w-3:131px] sm:-mx-2 sm:px-2">
        <div className="min-h-80 min-w-fit px-4 sm:px-0">
          <div className="relative min-w-120">
            <hr className="divider-md absolute top-1/2 left-0 w-full -translate-y-1/2 border-0" />
            <div className="relative z-10 flex w-full">
              <div className="flex grow">
                <TableColumnTitle className="px-0 pr-2">
                  {headerText}
                </TableColumnTitle>
              </div>
              <div className="flex shrink-0">
                {!displayedQuery && (
                  <TableColumnTitle className="mr-8">Stars</TableColumnTitle>
                )}
                <TableColumnTitle className="mr-13.5">Posts</TableColumnTitle>
                <TableColumnTitle className="px-0 pl-2">
                  Last Active
                </TableColumnTitle>
              </div>
            </div>
          </div>

          {displayRepos.length > 0 ? (
            <List className="mt-2 min-w-120 pb-2">
              {displayRepos.map((repo) => (
                <ListItem key={repo.name}>
                  <Link
                    className="group mr-3 flex grow items-center gap-1 overflow-hidden text-dim hover:underline"
                    href={repo.name}
                  >
                    <AsteriskIcon className="mt-0.5 text-faint" size={16} />
                    <span className="whitespace-nowrap leading-none group-hover:text-bright">
                      <HighlightedText
                        query={displayedQuery}
                        text={repo.name}
                      />
                    </span>
                  </Link>
                  <div className="flex shrink-0">
                    {!displayedQuery && (
                      <TableCellText className="w-(--col-w-1)">
                        {formatCompactNumber(repo.stars)}
                      </TableCellText>
                    )}
                    <TableCellText className="w-(--col-w-2)">
                      {formatCompactNumber(repo.posts)}
                    </TableCellText>
                    <TableCellText className="w-(--col-w-3) text-end">
                      {formatRelativeTime(repo.lastActive, now)}
                    </TableCellText>
                  </div>
                </ListItem>
              ))}
            </List>
          ) : displayedQuery ? (
            <p className="mt-4 text-muted">
              No repositories found for "{displayedQuery}".
            </p>
          ) : (
            <p className="mt-4 text-muted">
              No repositories yet. Search for a repo to get started!
            </p>
          )}
        </div>
      </div>
    </>
  )
}

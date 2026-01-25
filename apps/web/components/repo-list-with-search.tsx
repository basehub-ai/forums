"use client"

import { AsteriskIcon, SearchIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
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
  highlight?: string
  isIndexed?: boolean
}

const GH_URL_REGEX = /(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/]+)/i
const DOT_GIT_REGEX = /\.git$/
const HASH_REGEX = /[?#]/
const REPO_PATH_REGEX = /^\/?([^/]+)\/([^/]+)\/?$/

function parseRepoInput(input: string): { owner: string; repo: string } | null {
  const trimmed = input.trim()
  if (!trimmed) {
    return null
  }

  const githubUrlMatch = trimmed.match(GH_URL_REGEX)
  if (githubUrlMatch) {
    const [, owner, repo] = githubUrlMatch
    const cleanRepo = repo.replace(DOT_GIT_REGEX, "").split(HASH_REGEX)[0]
    return { owner, repo: cleanRepo }
  }

  const pathMatch = trimmed.match(REPO_PATH_REGEX)
  if (pathMatch) {
    const [, owner, repo] = pathMatch
    return { owner, repo }
  }

  return null
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
  const [typesenseResults, setTypesenseResults] = useState<
    SearchResult[] | null
  >(null)
  const [githubResults, setGithubResults] = useState<SearchResult[]>([])
  const [isGithubSearching, setIsGithubSearching] = useState(false)
  const [minHeight, setMinHeight] = useState<number | undefined>(undefined)
  const typesenseAbortRef = useRef<AbortController | null>(null)
  const githubAbortRef = useRef<AbortController | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: .
  useEffect(() => {
    if (containerRef.current && minHeight === undefined) {
      setMinHeight(containerRef.current.offsetHeight)
    }
  }, [])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const query = value.trim()

    if (!query || query.length < 1) {
      setTypesenseResults(null)
      setGithubResults([])
      setSearchQuery("")
      setDisplayedQuery("")
      setIsGithubSearching(false)
      return
    }

    typesenseAbortRef.current?.abort()
    githubAbortRef.current?.abort()
    const typesenseController = new AbortController()
    const githubController = new AbortController()
    typesenseAbortRef.current = typesenseController
    githubAbortRef.current = githubController

    setIsGithubSearching(true)
    setSearchQuery(query)

    fetch(`/api/search/repos?q=${encodeURIComponent(query)}`, {
      signal: typesenseController.signal,
    })
      .then((res) => res.json() as Promise<{ results?: SearchResult[] }>)
      .then((data) => {
        if (!typesenseController.signal.aborted) {
          setTypesenseResults(data.results ?? [])
          setDisplayedQuery(query)
        }
      })
      .catch((err) => {
        if (err instanceof Error && err.name !== "AbortError") {
          setTypesenseResults([])
        }
      })

    fetch(`/api/search/repos/github?q=${encodeURIComponent(query)}`, {
      signal: githubController.signal,
    })
      .then((res) => res.json() as Promise<{ results?: SearchResult[] }>)
      .then((data) => {
        if (!githubController.signal.aborted) {
          setGithubResults(data.results ?? [])
          setIsGithubSearching(false)
        }
      })
      .catch((err) => {
        if (err instanceof Error && err.name !== "AbortError") {
          setGithubResults([])
          setIsGithubSearching(false)
        }
      })

    return () => {
      typesenseAbortRef.current?.abort()
      githubAbortRef.current?.abort()
    }
  }, [value])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseRepoInput(value)
    if (parsed) {
      router.push(`/${parsed.owner}/${parsed.repo}`)
    }
  }

  const displayRepos = useMemo(() => {
    if (typesenseResults === null) {
      return topRepos
    }

    const indexed = new Set(typesenseResults.map((r) => r.name.toLowerCase()))
    const githubOnly = githubResults.filter(
      (r) => !indexed.has(r.name.toLowerCase())
    )
    const merged = [...typesenseResults, ...githubOnly]

    return merged
      .filter((r) =>
        r.name.toLowerCase().includes(displayedQuery.toLowerCase())
      )
      .slice(0, 5)
      .map((r) => ({
        name: r.name,
        highlight: r.highlight,
        stars: 0,
        posts: r.posts,
        lastActive: r.lastActive,
        isIndexed: r.isIndexed,
      }))
  }, [typesenseResults, githubResults, displayedQuery, topRepos])

  const headerText = searchQuery
    ? `Searching "${searchQuery}"`
    : "Popular Repos"

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
            autoFocus
            className="no-focus h-9 w-full bg-accent/5 pr-2 pl-8 font-medium text-accent text-base outline-dotted outline-2 outline-accent -outline-offset-1 placeholder:text-accent hover:bg-accent/10 focus:outline-dashed"
            maxLength={56}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Search or paste a repo URL"
            ref={inputRef}
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
        <div
          className="min-w-fit px-4 sm:px-0"
          ref={containerRef}
          style={minHeight ? { minHeight } : undefined}
        >
          <div className="relative min-w-120">
            <hr className="divider-md absolute top-1/2 left-0 w-full -translate-y-1/2 border-0 opacity-40" />
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
                <TableColumnTitle
                  className={displayedQuery ? "px-0 pl-2" : "mr-13.5"}
                >
                  Posts
                </TableColumnTitle>
                {!displayedQuery && (
                  <TableColumnTitle className="px-0 pl-2">
                    Last Active
                  </TableColumnTitle>
                )}
              </div>
            </div>
          </div>

          {displayRepos.length > 0 || isGithubSearching ? (
            <List className="mt-2 min-w-120 pb-2">
              {displayRepos.map((repo) => {
                const highlight =
                  "highlight" in repo ? (repo.highlight as string) : null
                return (
                  <ListItem key={repo.name}>
                    <Link
                      className="group mr-3 flex grow items-center gap-1 overflow-hidden text-dim hover:underline"
                      href={repo.name}
                    >
                      <AsteriskIcon className="mt-0.5 text-faint" size={16} />
                      {highlight ? (
                        <span
                          className="whitespace-nowrap leading-none group-hover:text-bright [&_mark]:bg-transparent [&_mark]:font-bold [&_mark]:text-bright"
                          // biome-ignore lint/security/noDangerouslySetInnerHtml: .
                          dangerouslySetInnerHTML={{ __html: highlight }}
                        />
                      ) : (
                        <span className="whitespace-nowrap leading-none group-hover:text-bright">
                          {repo.name}
                        </span>
                      )}
                    </Link>
                    <div className="flex shrink-0">
                      {!displayedQuery && (
                        <TableCellText className="w-(--col-w-1)">
                          {formatCompactNumber(repo.stars)}
                        </TableCellText>
                      )}
                      <TableCellText
                        className={
                          displayedQuery ? "text-end" : "w-(--col-w-2)"
                        }
                      >
                        {formatCompactNumber(repo.posts)}
                      </TableCellText>
                      {!displayedQuery && (
                        <TableCellText className="w-(--col-w-3) text-end">
                          {formatRelativeTime(repo.lastActive, now)}
                        </TableCellText>
                      )}
                    </div>
                  </ListItem>
                )
              })}
            </List>
          ) : displayedQuery ? (
            <p className="mt-4 text-muted">
              No forum found for this repo. Press Enter to go there!
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

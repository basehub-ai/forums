"use client"

import { FileTextIcon, GitBranchIcon, StarIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

type PostResult = {
  id: string
  number: number
  owner: string
  repo: string
  title: string | null
  createdAt: number
  commentCount: number
}

type RepoResult = {
  id: number
  fullName: string
  description: string | null
  stars: number
  url: string
  owner: string
  ownerAvatar: string
}

type SearchResults = {
  posts: PostResult[]
  repos: RepoResult[]
}

function useGlobalSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResults>({
    posts: [],
    repos: [],
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (query.length < 2) {
      setResults({ posts: [], repos: [] })
      return
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await fetch(
          `/api/search/global?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        )
        if (res.ok) {
          const data = (await res.json()) as SearchResults
          setResults(data)
        }
      } catch {
        // Ignore aborted requests
      } finally {
        setIsLoading(false)
      }
    }, 200)

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [query])

  return { query, setQuery, results, isLoading }
}

function SearchContent({
  query,
  mode,
  setQuery,
  results,
  isLoading,
  onSelect,
  showResults,
}: {
  query: string
  setQuery: (q: string) => void
  results: SearchResults
  isLoading: boolean
  onSelect: () => void
  mode: "inline" | "dialog"
  showResults?: boolean
}) {
  const router = useRouter()

  const handlePostSelect = useCallback(
    (post: PostResult) => {
      router.push(`/${post.owner}/${post.repo}/${post.number}`)
      onSelect()
    },
    [router, onSelect]
  )

  const handleRepoSelect = useCallback(
    (repo: RepoResult) => {
      router.push(`/${repo.fullName}`)
      onSelect()
    },
    [router, onSelect]
  )

  const hasResults = results.posts.length > 0 || results.repos.length > 0
  const shouldShowResults = showResults ?? (query.length >= 2 || hasResults)

  return (
    <>
      <CommandInput
        mode={mode}
        onValueChange={setQuery}
        placeholder="Search posts and repositories..."
        value={query}
      />
      {shouldShowResults ? (
        <CommandList
          className={cn(
            mode === "inline" &&
              "absolute inset-x-0 top-full z-50 mt-1 rounded-lg border bg-popover shadow-lg"
          )}
        >
          {query.length >= 2 && !isLoading && !hasResults ? (
            <CommandEmpty>No results found.</CommandEmpty>
          ) : null}
          {isLoading ? (
            query.length >= 2 ? (
              <div className="py-6 text-center text-muted-foreground text-sm">
                Searching...
              </div>
            ) : null
          ) : null}
          {results.posts.length > 0 ? (
            <CommandGroup heading="Posts">
              {results.posts.map((post) => (
                <CommandItem
                  key={post.id}
                  onSelect={() => handlePostSelect(post)}
                  value={`post-${post.id}-${post.title}`}
                >
                  <FileTextIcon className="mr-2 size-4" />
                  <div className="flex flex-col">
                    <span>{post.title || `Post #${post.number}`}</span>
                    <span className="text-muted-foreground text-xs">
                      {post.owner}/{post.repo} #{post.number}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {results.repos.length > 0 ? (
            <CommandGroup heading="GitHub Repositories">
              {results.repos.map((repo) => (
                <CommandItem
                  key={repo.id}
                  onSelect={() => handleRepoSelect(repo)}
                  value={`repo-${repo.id}-${repo.fullName}`}
                >
                  <GitBranchIcon className="mr-2 size-4" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span>{repo.fullName}</span>
                    {repo.description ? (
                      <span className="truncate text-muted-foreground text-xs">
                        {repo.description}
                      </span>
                    ) : null}
                  </div>
                  <span className="ml-2 flex items-center gap-1 text-muted-foreground text-xs">
                    <StarIcon className="size-3" />
                    {repo.stars.toLocaleString()}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
        </CommandList>
      ) : null}
    </>
  )
}

export function GlobalSearch() {
  const { query, setQuery, results, isLoading } = useGlobalSearch()
  const [isOpen, setIsOpen] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleSelect = useCallback(() => {
    setQuery("")
  }, [setQuery])

  // Re-open results when query changes
  useEffect(() => {
    if (query.length >= 2) {
      setIsOpen(true)
    }
  }, [query])

  // Handle Escape key - close results but keep query
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen])

  // Handle click outside - close results but keep query
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const showResults = isOpen && query.length >= 2

  return (
    <Command
      ref={containerRef}
      className="relative overflow-visible rounded-lg border"
    >
      <SearchContent
        isLoading={isLoading}
        mode="inline"
        onSelect={handleSelect}
        query={query}
        results={results}
        setQuery={setQuery}
        showResults={showResults}
      />
    </Command>
  )
}

export function GlobalSearchDialog() {
  const [open, setOpen] = useState(false)
  const { query, setQuery, results, isLoading } = useGlobalSearch()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen)
      if (!isOpen) {
        setQuery("")
      }
    },
    [setQuery]
  )

  const handleSelect = useCallback(() => {
    setOpen(false)
    setQuery("")
  }, [setQuery])

  return (
    <CommandDialog
      description="Search posts and GitHub repositories"
      onOpenChange={handleOpenChange}
      open={open}
      title="Search"
    >
      <SearchContent
        isLoading={isLoading}
        mode="dialog"
        onSelect={handleSelect}
        query={query}
        results={results}
        setQuery={setQuery}
      />
    </CommandDialog>
  )
}

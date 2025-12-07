"use client"

import { ChevronDown, Star } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { Button } from "./ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"

type RepoItem = {
  owner: string
  repo: string
  isFavorite: boolean
  lastAccessed: number
}

const STORAGE_KEY = "repo-history"
const MAX_RECENTS = 5

function useRepoHistory() {
  const [repos, setRepos] = useState<RepoItem[]>([])

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setRepos(JSON.parse(stored) as RepoItem[])
      } catch {
        setRepos([])
      }
    }
  }, [])

  const addRepo = useCallback((owner: string, repo: string) => {
    setRepos((prevRepos) => {
      const existing = prevRepos.find(
        (r) => r.owner === owner && r.repo === repo
      )
      let newRepos: RepoItem[]
      if (existing) {
        newRepos = prevRepos.map((r) =>
          r.owner === owner && r.repo === repo
            ? { ...r, lastAccessed: Date.now() }
            : r
        )
      } else {
        const newRepo: RepoItem = {
          owner,
          repo,
          isFavorite: false,
          lastAccessed: Date.now(),
        }
        newRepos = [...prevRepos, newRepo]
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newRepos))
      return newRepos
    })
  }, [])

  const toggleFavorite = useCallback((owner: string, repo: string) => {
    setRepos((prevRepos) => {
      const newRepos = prevRepos.map((r) =>
        r.owner === owner && r.repo === repo
          ? { ...r, isFavorite: !r.isFavorite }
          : r
      )
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newRepos))
      return newRepos
    })
  }, [])

  return { repos, addRepo, toggleFavorite }
}

export function RepoSwitcher() {
  const router = useRouter()
  const params = useParams()
  const { repos, addRepo, toggleFavorite } = useRepoHistory()
  const [search, setSearch] = useState("")

  const owner = params?.owner as string | undefined
  const repo = params?.repo as string | undefined

  useEffect(() => {
    if (owner && repo) {
      addRepo(owner, repo)
    }
  }, [owner, repo, addRepo])

  const allRepos = [
    ...repos
      .filter((r) => r.isFavorite)
      .sort((a, b) => b.lastAccessed - a.lastAccessed),
    ...repos
      .filter((r) => !r.isFavorite)
      .sort((a, b) => b.lastAccessed - a.lastAccessed)
      .slice(0, MAX_RECENTS),
  ]

  const filteredRepos = search
    ? allRepos.filter((r) => {
        const repoString = `${r.owner}/${r.repo}`.toLowerCase()
        return repoString.includes(search.toLowerCase())
      })
    : allRepos

  const handleRepoSelect = (owner2: string, repo2: string) => {
    router.push(`/${owner2}/${repo2}`)
    setSearch("")
  }

  const handleSubmit = () => {
    const parts = search.trim().split("/")
    if (parts.length === 2) {
      const [newOwner, newRepo] = parts
      handleRepoSelect(newOwner, newRepo)
    }
  }

  if (!(owner && repo)) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="gap-2" variant="ghost">
          <span className="font-medium">
            {owner}/{repo}
          </span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-64">
        <div className="p-2">
          <input
            autoFocus
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSubmit()
              }
            }}
            placeholder="Search or enter owner/repo"
            type="text"
            value={search}
          />
        </div>

        {filteredRepos.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {filteredRepos.map((r) => {
              const isCurrentRepo = r.owner === owner && r.repo === repo
              return (
                <DropdownMenuItem
                  className="flex items-center justify-between"
                  key={`${r.owner}/${r.repo}`}
                  onClick={() => handleRepoSelect(r.owner, r.repo)}
                >
                  <span className={isCurrentRepo ? "font-semibold" : ""}>
                    {r.owner}/{r.repo}
                  </span>
                  <button
                    className={
                      r.isFavorite
                        ? "text-yellow-500 hover:text-yellow-600"
                        : "text-muted-foreground hover:text-yellow-500"
                    }
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavorite(r.owner, r.repo)
                    }}
                    type="button"
                  >
                    <Star
                      className={
                        r.isFavorite ? "h-4 w-4 fill-current" : "h-4 w-4"
                      }
                    />
                  </button>
                </DropdownMenuItem>
              )
            })}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

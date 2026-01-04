"use client"

import { SearchIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

function parseRepoInput(input: string): { owner: string; repo: string } | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  // Try parsing as GitHub URL
  // Matches: https://github.com/owner/repo, github.com/owner/repo, etc.
  const githubUrlMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/]+)/i
  )
  if (githubUrlMatch) {
    const [, owner, repo] = githubUrlMatch
    // Remove any trailing .git or other extensions
    const cleanRepo = repo.replace(/\.git$/, "").split(/[?#]/)[0]
    return { owner, repo: cleanRepo }
  }

  // Try parsing as owner/repo format (with or without leading slash)
  const pathMatch = trimmed.match(/^\/?([^/]+)\/([^/]+)\/?$/)
  if (pathMatch) {
    const [, owner, repo] = pathMatch
    return { owner, repo }
  }

  return null
}

export function RepoSearchInput() {
  const router = useRouter()
  const [value, setValue] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseRepoInput(value)
    if (parsed) {
      router.push(`/${parsed.owner}/${parsed.repo}`)
    }
  }

  return (
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
          className="no-focus h-9 w-full bg-accent/5 pr-2 pl-8 font-medium text-accent text-base outline-dashed outline-2 outline-accent -outline-offset-1 placeholder:text-accent hover:bg-accent/10 focus:outline-solid"
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
  )
}

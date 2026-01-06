"use client"

import { useEffect, useRef, useState } from "react"
import type { PostSearchResult } from "@/app/api/search/posts/route"

type UsePostSearchOptions = {
  owner: string
  repo: string
  categoryId?: string
  minQueryLength?: number
}

export function usePostSearch({
  owner,
  repo,
  categoryId,
  minQueryLength = 2,
}: UsePostSearchOptions) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<PostSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const trimmed = query.trim()

    if (!trimmed || trimmed.length < minQueryLength) {
      setResults([])
      setIsSearching(false)
      return
    }

    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    setIsSearching(true)

    const params = new URLSearchParams({
      q: trimmed,
      owner,
      repo,
    })
    if (categoryId) {
      params.set("categoryId", categoryId)
    }

    fetch(`/api/search/posts?${params}`, {
      signal: controller.signal,
    })
      .then((res) => res.json() as Promise<{ results?: PostSearchResult[] }>)
      .then((data) => {
        if (!controller.signal.aborted) {
          setResults(data.results ?? [])
          setIsSearching(false)
        }
      })
      .catch((err) => {
        if (err instanceof Error && err.name !== "AbortError") {
          setResults([])
          setIsSearching(false)
        }
      })

    return () => {
      abortControllerRef.current?.abort()
    }
  }, [query, owner, repo, categoryId, minQueryLength])

  return {
    query,
    setQuery,
    results,
    isSearching,
    hasQuery: query.trim().length >= minQueryLength,
  }
}

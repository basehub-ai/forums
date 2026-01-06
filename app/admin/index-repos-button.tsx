"use client"

import { useState } from "react"

export function IndexReposButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function handleClick() {
    setIsLoading(true)
    setResult(null)

    try {
      const res = await fetch("/api/index-repos", { method: "POST" })
      const data = (await res.json()) as {
        success: boolean
        repos?: number
        posts?: number
        comments?: number
        error?: string
      }

      if (data.success) {
        setResult(
          `${data.repos} repos, ${data.posts} posts, ${data.comments} comments`
        )
      } else {
        setResult(data.error ?? "Failed")
      }
    } catch {
      setResult("Network error")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <span className="text-bright">Reindex All</span>
      {result && <span className="text-muted text-sm">({result})</span>}
      <button
        className="ml-auto bg-highlight-yellow px-1.5 py-0.5 text-background text-xs disabled:opacity-50"
        disabled={isLoading}
        onClick={handleClick}
        type="button"
      >
        {isLoading ? "Running..." : "Run"}
      </button>
    </>
  )
}

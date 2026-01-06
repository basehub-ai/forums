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
        indexed?: number
        error?: string
      }

      if (data.success) {
        setResult(`Indexed ${data.indexed} repos`)
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
      <button
        className="bg-highlight-yellow px-1.5 py-0.5 text-bright disabled:opacity-50"
        disabled={isLoading}
        onClick={handleClick}
        type="button"
      >
        {isLoading ? "Running..." : "Run"}
      </button>
      <span className="text-bright">Index Repos</span>
      {result && <span className="text-muted text-sm">({result})</span>}
    </>
  )
}

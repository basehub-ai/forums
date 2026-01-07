"use client"

import { useState } from "react"

export function EnsureCollectionsButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function handleClick() {
    setIsLoading(true)
    setResult(null)

    try {
      const res = await fetch("/api/admin/search/ensure-collections", {
        method: "POST",
      })
      const data = (await res.json()) as {
        success: boolean
        error?: string
      }

      if (data.success) {
        setResult("Done")
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
      <span className="text-bright">Ensure Collections</span>
      {result && <span className="text-muted text-sm">({result})</span>}
    </>
  )
}

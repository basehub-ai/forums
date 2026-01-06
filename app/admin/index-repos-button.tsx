"use client"

import { useState } from "react"

export function IndexReposButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

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
        setResult({
          success: true,
          message: `Indexed ${data.indexed} repositories`,
        })
      } else {
        setResult({
          success: false,
          message: data.error ?? "Indexing failed",
        })
      }
    } catch {
      setResult({
        success: false,
        message: "Network error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        className="rounded bg-accent px-4 py-2 text-background hover:bg-accent/90 disabled:opacity-50"
        disabled={isLoading}
        onClick={handleClick}
        type="button"
      >
        {isLoading ? "Indexing..." : "Run Index"}
      </button>
      {result && (
        <p className={result.success ? "text-green-600" : "text-red-600"}>
          {result.message}
        </p>
      )}
    </div>
  )
}

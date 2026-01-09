"use client"

import { useState } from "react"

export function RecreateCommentsButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{
    ok: boolean
    message: string
  } | null>(null)

  async function handleClick() {
    setIsLoading(true)
    setResult(null)

    try {
      const res = await fetch("/api/admin/search/recreate-comments", {
        method: "POST",
      })
      const data = (await res.json()) as {
        success: boolean
        error?: string
      }

      if (data.success) {
        setResult({ ok: true, message: "Done" })
      } else {
        setResult({ ok: false, message: data.error ?? "Failed" })
      }
    } catch (e) {
      setResult({ ok: false, message: String(e) })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <span className="text-bright">Recreate Comments Collection</span>
      {result && (
        <span
          className={result.ok ? "text-muted text-sm" : "text-red-400 text-sm"}
        >
          — {result.message}
        </span>
      )}
      <button
        className="ml-auto bg-highlight-yellow px-1 py-0.5 text-black text-xs disabled:opacity-50"
        disabled={isLoading}
        onClick={handleClick}
        type="button"
      >
        {isLoading ? "..." : "Run"}
      </button>
    </>
  )
}

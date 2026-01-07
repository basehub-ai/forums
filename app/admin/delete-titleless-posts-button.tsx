"use client"

import { useState } from "react"
import { deletePostsWithoutTitle } from "@/lib/actions/admin"

export function DeleteTitlelessPostsButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function handleClick() {
    if (
      !confirm(
        "This will permanently delete all posts without a title. Continue?"
      )
    ) {
      return
    }

    setIsLoading(true)
    setResult(null)

    try {
      const data = await deletePostsWithoutTitle()

      if (data.success) {
        setResult(`Deleted ${data.deleted} posts`)
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
      <span className="text-bright">Delete Titleless Posts</span>
      {result && <span className="text-muted text-sm">({result})</span>}
    </>
  )
}

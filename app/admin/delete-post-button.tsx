"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { deletePostByUrl } from "@/lib/actions/posts"

export function DeletePostButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [postUrl, setPostUrl] = useState("")
  const router = useRouter()

  async function handleClick() {
    const trimmed = postUrl.trim()
    if (!trimmed) {
      setResult("Post URL required")
      return
    }

    if (
      !confirm(
        "This will permanently delete the post and all its comments. Continue?"
      )
    ) {
      return
    }

    setIsLoading(true)
    setResult(null)

    try {
      const res = await deletePostByUrl(trimmed)
      setResult(`Deleted: ${res.deleted}`)
      setPostUrl("")
      router.refresh()
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Failed to delete post")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <input
          className="border border-faint bg-shade px-2 py-0.5 text-bright"
          onChange={(e) => setPostUrl(e.target.value)}
          placeholder="/owner/repo/123"
          type="text"
          value={postUrl}
        />
        <button
          className="bg-highlight-yellow px-1.5 py-0.5 text-bright disabled:opacity-50"
          disabled={isLoading}
          onClick={handleClick}
          type="button"
        >
          {isLoading ? "Deleting..." : "Delete"}
        </button>
        <span className="text-bright">Delete Post</span>
      </div>
      {result && <span className="text-muted text-sm">({result})</span>}
    </>
  )
}

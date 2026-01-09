"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { deletePost } from "@/lib/actions/posts"

export function DeletePostButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [postId, setPostId] = useState("")
  const router = useRouter()

  async function handleClick() {
    if (!postId.trim()) {
      setResult("Post ID required")
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
      await deletePost(postId.trim())
      setResult("Post deleted successfully")
      setPostId("")
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
          onChange={(e) => setPostId(e.target.value)}
          placeholder="Post ID"
          type="text"
          value={postId}
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

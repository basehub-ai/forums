"use client"

import { Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { deletePost } from "@/lib/actions/posts"
import { authClient } from "@/lib/auth-client"
import { usePostMetadata } from "./post-metadata-context"

export function DeletePostButton() {
  const { postId, authorId, owner, repo } = usePostMetadata()
  const session = authClient.useSession()
  const userId = session.data?.user.id
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const isAuthor = userId === authorId

  if (!(userId && isAuthor)) {
    return null
  }

  function handleDelete() {
    if (
      !confirm(
        "Are you sure you want to delete this post? This action cannot be undone."
      )
    ) {
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        await deletePost(postId)
        router.push(`/${owner}/${repo}`)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete post")
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <button
        className="flex items-center gap-1.5 border border-red-500 bg-red-500/10 px-2 py-1 text-red-500 text-sm hover:bg-red-500/20 disabled:opacity-50"
        disabled={isPending}
        onClick={handleDelete}
        type="button"
      >
        <Trash2 size={14} />
        {isPending ? "Deleting..." : "Delete Post"}
      </button>
      {error && <span className="text-red-500 text-sm">{error}</span>}
    </div>
  )
}

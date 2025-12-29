"use client"

import { PencilIcon } from "lucide-react"
import { useState } from "react"
import { authClient } from "@/lib/auth-client"
import { PostEditForm } from "./post-edit-form"
import { usePostMetadata } from "./post-metadata-context"

export function PostTitle() {
  const { title, authorId, category } = usePostMetadata()
  const [isEditing, setIsEditing] = useState(false)
  const { data: auth } = authClient.useSession()
  const isAuthor = auth?.user?.id === authorId

  if (isEditing) {
    return <PostEditForm onClose={() => setIsEditing(false)} />
  }

  if (!title) {
    return (
      <h1 className="relative overflow-hidden font-medium text-2xl text-muted-foreground">
        <span>Generating title...</span>
        <span className="-translate-x-full absolute inset-0 animate-[shimmer_2s_infinite] bg-linear-to-r from-transparent via-white/20 to-transparent" />
      </h1>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="group flex items-start gap-2">
        <h1 className="font-medium text-2xl">{title}</h1>
        {isAuthor && (
          <button
            className="mt-1 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => setIsEditing(true)}
            title="Edit post"
            type="button"
          >
            <PencilIcon className="h-4 w-4 text-muted-foreground hover:text-bright" />
          </button>
        )}
      </div>
      {category && (
        <div className="text-muted-foreground text-sm">
          {category.emoji && <span className="mr-1">{category.emoji}</span>}
          {category.title}
        </div>
      )}
    </div>
  )
}

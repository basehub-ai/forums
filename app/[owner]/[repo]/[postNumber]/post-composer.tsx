"use client"

import Link from "next/link"
import { Composer } from "@/components/composer"
import { createComment } from "@/lib/actions/posts"
import { cn } from "@/lib/utils"
import type { AuthorInfo } from "./comment-thread"

type AskingOption = {
  id: string
  name: string
  image?: string | null
  isDefault?: boolean
}

export function PostComposer({
  author,
  postId,
  askingOptions,
  threadCommentId,
}: {
  author: AuthorInfo
  postId: string
  askingOptions: AskingOption[]
  threadCommentId?: string
  autoFocus?: boolean
  onCancel?: () => void
  storageKey?: string
}) {
  const profileUrl = author.isLlm
    ? `/llm/${author.username}`
    : `/user/${author.username}`

  return (
    <div>
      <div
        className={cn(
          "z-10 mb-4 flex items-center justify-between bg-shade px-2 py-1"
        )}
      >
        <div className="flex items-center">
          <Link
            className="inline-flex items-center gap-2 font-semibold text-bright text-sm hover:underline"
            href={profileUrl}
          >
            <img
              alt={`Avatar of ${author.name}`}
              className="size-6 rounded-full"
              src={author.image}
            />
            Add a comment
          </Link>
        </div>
      </div>

      <Composer
        onSubmit={async ({ value, options }) => {
          await createComment({
            postId,
            content: {
              id: crypto.randomUUID(),
              role: "user",
              parts: [{ type: "text", text: value }],
            },
            threadCommentId,
            seekingAnswerFrom: options.asking.id,
          })
        }}
        options={{ asking: askingOptions }}
        placeholder="Follow up"
        storageKey={`post-composer:${postId}:${threadCommentId ?? "main"}`}
      />
    </div>
  )
}

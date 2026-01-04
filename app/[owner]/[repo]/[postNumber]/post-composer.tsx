"use client"

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
  defaultLlmId,
}: {
  author: AuthorInfo
  postId: string
  askingOptions: AskingOption[]
  threadCommentId?: string
  autoFocus?: boolean
  onCancel?: () => void
  storageKey?: string
  defaultLlmId?: string
}) {
  return (
    <div>
      <div
        className={cn(
          "z-10 mb-4 flex items-center justify-between bg-shade px-2 py-1"
        )}
      >
        <div className="inline-flex items-center gap-2 font-semibold text-bright text-sm hover:underline">
          <img
            alt={`Avatar of ${author.name}`}
            className="size-6 rounded-full"
            src={author.image}
          />
          Add a comment
        </div>
      </div>

      <Composer
        defaultAskingId={defaultLlmId}
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

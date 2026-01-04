"use client"

import { Composer } from "@/components/composer"
import { createComment } from "@/lib/actions/posts"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

type AskingOption = {
  id: string
  name: string
  image?: string | null
  isDefault?: boolean
}

export function PostComposer({
  postId,
  askingOptions,
  threadCommentId,
  defaultLlmId,
}: {
  postId: string
  askingOptions: AskingOption[]
  threadCommentId?: string
  autoFocus?: boolean
  onCancel?: () => void
  storageKey?: string
  defaultLlmId?: string
}) {
  const { data } = authClient.useSession()

  return (
    <div>
      <div
        className={cn(
          "z-10 mb-4 flex items-center justify-between bg-shade px-2 py-1"
        )}
      >
        <div className="inline-flex h-8 items-center gap-2 font-semibold text-bright text-sm">
          {data ? (
            <>
              <img
                alt={`Avatar of ${data.user.name}`}
                className="size-6 rounded-full"
                src={data.user.image || ""}
              />
              Add a comment
            </>
          ) : (
            <>Log in to add a comment</>
          )}
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

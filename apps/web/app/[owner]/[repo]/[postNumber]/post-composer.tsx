"use client"

import { useEffect, useState } from "react"
import { Composer } from "@/components/composer"
import { UserAvatar } from "@/components/user-avatar"
import { checkCanModerate, createComment } from "@/lib/actions/posts"
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
  owner,
  repo,
}: {
  postId: string
  askingOptions: AskingOption[]
  threadCommentId?: string
  autoFocus?: boolean
  onCancel?: () => void
  storageKey?: string
  defaultLlmId?: string
  owner?: string
  repo?: string
}) {
  const [canModerate, setCanModerate] = useState(false)

  useEffect(() => {
    if (owner && repo) {
      checkCanModerate(owner, repo).then(setCanModerate)
    }
  }, [owner, repo])
  const { data, isPending: isAuthLoading } = authClient.useSession()

  return (
    <div>
      {isAuthLoading ? (
        <div className="mb-4 h-8" />
      ) : (
        <div
          className={cn(
            "z-10 mb-4 flex h-8 items-center justify-between bg-shade px-2 py-1"
          )}
        >
          <div className="inline-flex animate-fade-in items-center gap-2 font-semibold text-bright text-sm">
            {data?.user?.image && data?.user?.username ? (
              <>
                <UserAvatar
                  src={data.user.image}
                  username={data.user.username}
                />
                Add a comment
              </>
            ) : (
              <>Log in to add a comment</>
            )}
          </div>
        </div>
      )}

      <Composer
        canModerate={canModerate}
        defaultAskingId={defaultLlmId}
        onSubmit={async ({ value, options, mode }) => {
          await createComment({
            postId,
            content: {
              id: crypto.randomUUID(),
              role: "user",
              parts: [{ type: "text", text: value }],
            },
            threadCommentId,
            seekingAnswerFrom: options.asking.id,
            mode,
          })
        }}
        options={{ asking: askingOptions }}
        placeholder="Follow up"
        storageKey={`post-composer:${postId}:${threadCommentId ?? "main"}`}
      />
    </div>
  )
}

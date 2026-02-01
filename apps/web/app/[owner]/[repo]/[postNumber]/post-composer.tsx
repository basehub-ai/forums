"use client"

import { usePathname } from "next/navigation"
import { useEffect, useState, useTransition } from "react"
import type { AgentMode } from "@/agent/types"
import { Composer } from "@/components/composer"
import { UserAvatar } from "@/components/user-avatar"
import { checkCanModerate, createComment } from "@/lib/actions/posts"
import { checkHasRepoScope } from "@/lib/actions/scopes"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"
import { useHasStreamingComment } from "./streaming-state-context"

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
  defaultMode,
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
  defaultMode?: AgentMode
  owner?: string
  repo?: string
}) {
  const hasStreamingComment = useHasStreamingComment()
  const pathname = usePathname()
  const { data, isPending: isAuthLoading } = authClient.useSession()
  const userId = data?.user?.id
  const [canModerate, setCanModerate] = useState(false)
  const [hasRepoScope, setHasRepoScope] = useState(false)
  const [, startTransition] = useTransition()

  // Re-fetch permissions when user changes (e.g., after OAuth redirect)
  useEffect(() => {
    if (!userId || !owner || !repo) {
      setCanModerate(false)
      setHasRepoScope(false)
      return
    }
    Promise.all([checkCanModerate(owner, repo), checkHasRepoScope()]).then(
      ([moderateResult, scopeResult]) => {
        setCanModerate(moderateResult)
        setHasRepoScope(scopeResult)
      }
    )
  }, [owner, repo, userId])

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
        defaultMode={defaultMode}
        hasRepoScope={hasRepoScope}
        isStreaming={hasStreamingComment}
        onRequestRepoScope={() => {
          startTransition(async () => {
            await authClient.linkSocial({
              provider: "github",
              scopes: ["repo"],
              callbackURL: pathname,
            })
          })
        }}
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

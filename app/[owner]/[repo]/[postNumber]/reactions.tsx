"use client"

import { Menu } from "@base-ui/react/menu"
import { Tooltip } from "@base-ui/react/tooltip"
import { SmilePlusIcon, ThumbsDownIcon, ThumbsUpIcon } from "lucide-react"
import { useTransition } from "react"
import { addReaction, removeReaction } from "@/lib/actions/posts"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

const REACTION_TYPES = [
  { type: "+1", emoji: "👍" },
  { type: "-1", emoji: "👎" },
  { type: "heart", emoji: "❤️" },
  { type: "laugh", emoji: "😄" },
  { type: "salute", emoji: "🫡" },
  { type: "confused", emoji: "😕" },
  { type: "rocket", emoji: "🚀" },
  { type: "hooray", emoji: "🎉" },
  { type: "eyes", emoji: "👀" },
  { type: "fire", emoji: "🔥" },
] as const

const OTHER_REACTIONS = REACTION_TYPES.filter(
  (r) => r.type !== "+1" && r.type !== "-1"
)

export function ReactionButtons({
  owner,
  repo,
  postId,
  commentId,
  reactions,
}: {
  owner: string
  repo: string
  postId: string
  commentId: string
  reactions: { type: string; userId: string }[]
}) {
  const userId = authClient.useSession().data?.user.id
  const [isPending, startTransition] = useTransition()

  const reactionCounts = reactions.reduce(
    (acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const userReactions = new Set(
    reactions.filter((r) => r.userId === userId).map((r) => r.type)
  )

  const handleReaction = (type: string) => {
    if (!userId) {
      return
    }

    startTransition(async () => {
      if (userReactions.has(type)) {
        await removeReaction({ commentId, type, owner, repo, postId })
      } else {
        await addReaction({ commentId, type, owner, repo, postId })
      }
    })
  }

  const otherActiveReactions = OTHER_REACTIONS.filter(
    (r) => (reactionCounts[r.type] ?? 0) > 0
  )

  const upvoteCount = reactionCounts["+1"] ?? 0
  const downvoteCount = reactionCounts["-1"] ?? 0

  const isSignedIn = !!userId

  const upvoteButton = (
    <button
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
        userReactions.has("+1")
          ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900"
          : "hover:bg-muted",
        !isSignedIn && "cursor-not-allowed opacity-50"
      )}
      disabled={isPending || !isSignedIn}
      onClick={() => handleReaction("+1")}
      type="button"
    >
      <ThumbsUpIcon className="size-3" />
      <span>{upvoteCount}</span>
    </button>
  )

  const downvoteButton = (
    <button
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
        userReactions.has("-1")
          ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900"
          : "hover:bg-muted",
        !isSignedIn && "cursor-not-allowed opacity-50"
      )}
      disabled={isPending || !isSignedIn}
      onClick={() => handleReaction("-1")}
      type="button"
    >
      <ThumbsDownIcon className="size-3" />
      <span>{downvoteCount}</span>
    </button>
  )

  const signedOutTooltip = "You must be signed in to react"

  return (
    <Tooltip.Provider>
      <div className="flex flex-wrap items-center gap-1">
        {isSignedIn ? (
          upvoteButton
        ) : (
          <Tooltip.Root>
            <Tooltip.Trigger render={upvoteButton} />
            <Tooltip.Portal>
              <Tooltip.Positioner>
                <Tooltip.Popup>{signedOutTooltip}</Tooltip.Popup>
              </Tooltip.Positioner>
            </Tooltip.Portal>
          </Tooltip.Root>
        )}

        {isSignedIn ? (
          downvoteButton
        ) : (
          <Tooltip.Root>
            <Tooltip.Trigger render={downvoteButton} />
            <Tooltip.Portal>
              <Tooltip.Positioner>
                <Tooltip.Popup>{signedOutTooltip}</Tooltip.Popup>
              </Tooltip.Positioner>
            </Tooltip.Portal>
          </Tooltip.Root>
        )}

        {otherActiveReactions.map((r) => {
          const button = (
            <button
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
                userReactions.has(r.type)
                  ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900"
                  : "hover:bg-muted",
                !isSignedIn && "cursor-not-allowed opacity-50"
              )}
              disabled={isPending || !isSignedIn}
              key={r.type}
              onClick={() => handleReaction(r.type)}
              type="button"
            >
              <span>{r.emoji}</span>
              <span>{reactionCounts[r.type]}</span>
            </button>
          )
          return isSignedIn ? (
            <span key={r.type}>{button}</span>
          ) : (
            <Tooltip.Root key={r.type}>
              <Tooltip.Trigger render={button} />
              <Tooltip.Portal>
                <Tooltip.Positioner>
                  <Tooltip.Popup>{signedOutTooltip}</Tooltip.Popup>
                </Tooltip.Positioner>
              </Tooltip.Portal>
            </Tooltip.Root>
          )
        })}

        {isSignedIn ? (
          <Menu.Root>
            <Menu.Trigger
              className="inline-flex h-5.5 items-center rounded-full border px-2 py-0.5 text-xs transition-colors hover:bg-muted disabled:opacity-50"
              disabled={isPending}
            >
              <SmilePlusIcon className="size-3" />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner align="start">
                <Menu.Popup>
                  <div className="grid grid-cols-4 gap-1 p-1">
                    {OTHER_REACTIONS.map((r) => (
                      <Menu.Item
                        className={cn(
                          "flex cursor-pointer items-center justify-center rounded p-2 text-base",
                          userReactions.has(r.type) &&
                            "bg-blue-50 dark:bg-blue-900"
                        )}
                        key={r.type}
                        onClick={() => handleReaction(r.type)}
                      >
                        {r.emoji}
                      </Menu.Item>
                    ))}
                  </div>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        ) : null}
      </div>
    </Tooltip.Provider>
  )
}

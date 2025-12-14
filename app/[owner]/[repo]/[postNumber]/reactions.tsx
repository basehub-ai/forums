"use client"

import { SmilePlusIcon, ThumbsDownIcon, ThumbsUpIcon } from "lucide-react"
import { useTransition } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  console.log("reactions", reactions)

  const upvoteCount = reactionCounts["+1"] ?? 0
  const downvoteCount = reactionCounts["-1"] ?? 0

  return (
    <div className="flex flex-wrap items-center gap-1">
      <button
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
          userReactions.has("+1")
            ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900"
            : "hover:bg-muted"
        )}
        disabled={isPending || !userId}
        onClick={() => handleReaction("+1")}
        type="button"
      >
        <ThumbsUpIcon className="size-3" />
        {upvoteCount > 0 && <span>{upvoteCount}</span>}
      </button>

      <button
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
          userReactions.has("-1")
            ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900"
            : "hover:bg-muted"
        )}
        disabled={isPending || !userId}
        onClick={() => handleReaction("-1")}
        type="button"
      >
        <ThumbsDownIcon className="size-3" />
        {downvoteCount > 0 && <span>{downvoteCount}</span>}
      </button>

      {otherActiveReactions.map((r) => (
        <button
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
            userReactions.has(r.type)
              ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900"
              : "hover:bg-muted"
          )}
          disabled={isPending || !userId}
          key={r.type}
          onClick={() => handleReaction(r.type)}
          type="button"
        >
          <span>{r.emoji}</span>
          <span>{reactionCounts[r.type]}</span>
        </button>
      ))}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs transition-colors hover:bg-muted disabled:opacity-50"
            disabled={isPending || !userId}
            type="button"
          >
            <SmilePlusIcon className="size-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <div className="grid grid-cols-4 gap-1 p-1">
            {OTHER_REACTIONS.map((r) => (
              <DropdownMenuItem
                className={cn(
                  "flex cursor-pointer items-center justify-center rounded p-2 text-base",
                  userReactions.has(r.type) && "bg-blue-50 dark:bg-blue-900"
                )}
                key={r.type}
                onClick={() => handleReaction(r.type)}
              >
                {r.emoji}
              </DropdownMenuItem>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

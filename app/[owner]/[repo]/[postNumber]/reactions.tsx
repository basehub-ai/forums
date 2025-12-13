"use client"

import type { InferSelectModel } from "drizzle-orm"
import { useTransition } from "react"
import { addReaction, removeReaction } from "@/lib/actions/posts"
import type { reactions as reactionsScheam } from "@/lib/db/schema"
import { cn } from "@/lib/utils"

type Reaction = InferSelectModel<typeof reactionsScheam>

const REACTION_TYPES = [
  { type: "+1", emoji: "👍" },
  { type: "-1", emoji: "👎" },
  { type: "heart", emoji: "❤️" },
  { type: "laugh", emoji: "😄" },
  { type: "hooray", emoji: "🎉" },
  { type: "confused", emoji: "😕" },
  { type: "rocket", emoji: "🚀" },
  { type: "eyes", emoji: "👀" },
] as const

export function ReactionButtons({
  commentId,
  reactions,
  currentUserId,
}: {
  commentId: string
  reactions: Reaction[]
  currentUserId?: string
}) {
  const [isPending, startTransition] = useTransition()

  const reactionCounts = reactions.reduce(
    (acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const userReactions = new Set(
    reactions.filter((r) => r.userId === currentUserId).map((r) => r.type)
  )

  const handleReaction = (type: string) => {
    if (!currentUserId) {
      return
    }

    startTransition(async () => {
      if (userReactions.has(type)) {
        await removeReaction(commentId, type)
      } else {
        await addReaction(commentId, type)
      }
    })
  }

  const activeReactions = REACTION_TYPES.filter(
    (r) => (reactionCounts[r.type] ?? 0) > 0
  )

  if (activeReactions.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-1">
      {activeReactions.map((r) => (
        <button
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
            userReactions.has(r.type)
              ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900"
              : "hover:bg-muted"
          )}
          disabled={isPending || !currentUserId}
          key={r.type}
          onClick={() => handleReaction(r.type)}
          type="button"
        >
          <span>{r.emoji}</span>
          <span>{reactionCounts[r.type]}</span>
        </button>
      ))}
    </div>
  )
}

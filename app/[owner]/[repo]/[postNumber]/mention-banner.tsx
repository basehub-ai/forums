"use client"

import type { InferSelectModel } from "drizzle-orm"
import { MessageCircleIcon } from "lucide-react"
import Link from "next/link"
import type { mentions as mentionsSchema } from "@/lib/db/schema"

type Mention = InferSelectModel<typeof mentionsSchema>

type AuthorInfo = {
  name: string
  username: string
  image: string
  isLlm: boolean
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return days === 1 ? "1 day ago" : `${days} days ago`
  }
  if (hours > 0) {
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`
  }
  if (minutes > 0) {
    return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`
  }
  return "just now"
}

export function MentionBanner({
  mention,
  author,
}: {
  mention: Mention
  author: AuthorInfo | undefined
}) {
  const sourcePostUrl = `/${mention.sourcePostOwner}/${mention.sourcePostRepo}/${mention.sourcePostNumber}`

  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-muted-foreground text-sm">
      {author ? (
        <img
          alt={`Avatar of ${author.name}`}
          className="h-5 w-5 rounded-full"
          src={author.image}
        />
      ) : null}
      <span>
        <span className="font-medium text-foreground">
          {author?.username ?? mention.authorUsername ?? "Someone"}
        </span>{" "}
        mentioned this post{" "}
        <span className="underline decoration-dotted underline-offset-2">
          {formatRelativeTime(mention.createdAt)}
        </span>
      </span>
      <Link
        className="ml-auto flex items-center gap-1.5 text-foreground hover:underline"
        href={sourcePostUrl}
      >
        <MessageCircleIcon className="h-4 w-4 text-orange-500" />
        <span className="max-w-[200px] truncate">
          {mention.sourcePostTitle ?? `#${mention.sourcePostNumber}`}
        </span>
      </Link>
    </div>
  )
}

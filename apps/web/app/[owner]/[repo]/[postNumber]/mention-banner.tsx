"use client"

import type { InferSelectModel } from "drizzle-orm"
import { MessageCircleIcon } from "lucide-react"
import Link from "next/link"
import { RelativeTime } from "@/components/relative-time"
import { UserAvatar } from "@/components/user-avatar"
import type { mentions as mentionsSchema } from "@/lib/db/schema"

type Mention = InferSelectModel<typeof mentionsSchema>

type AuthorInfo = {
  name: string
  username: string
  image: string
  isLlm: boolean
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
    <div className="flex items-center gap-2 text-muted-foreground text-sm">
      {author ? (
        <UserAvatar src={author.image} username={author.username} />
      ) : null}
      <span>
        <span className="font-medium text-bright">
          {author?.name ?? mention.authorUsername ?? "Someone"}
        </span>{" "}
        mentioned this post{" "}
        <RelativeTime
          className="underline decoration-dotted underline-offset-2"
          timestamp={mention.createdAt}
        />
      </span>
      <Link
        className="ml-auto flex items-center gap-1.5 hover:underline"
        href={sourcePostUrl}
      >
        <MessageCircleIcon className="size-4 text-accent" />
        <span className="max-w-xs truncate text-bright">
          {mention.sourcePostTitle ?? `#${mention.sourcePostNumber}`}
        </span>
      </Link>
    </div>
  )
}

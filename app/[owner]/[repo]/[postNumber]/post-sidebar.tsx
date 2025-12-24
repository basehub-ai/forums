"use client"

import { CommitIcon } from "@radix-ui/react-icons"
import { GitBranchIcon } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { usePostMetadata } from "./post-metadata-context"

type Participant = {
  id: string
  name: string
  image: string | null
}

export function PostSidebar({ participants }: { participants: Participant[] }) {
  const { owner, repo } = useParams<{ owner: string; repo: string }>()
  const { category } = usePostMetadata()

  return (
    <aside className="w-64 shrink-0 space-y-4">
      <div>
        <h3 className="mb-2 font-medium text-muted-foreground text-sm">
          {participants.length} participant
          {participants.length !== 1 ? "s" : ""}
        </h3>
        <div className="flex flex-wrap gap-1">
          {participants.map((p, i) => (
            <img
              alt={p.name}
              className="h-8 w-8 rounded-lg"
              // biome-ignore lint/suspicious/noArrayIndexKey: They are effectively the same
              key={p.id + i}
              src={
                p.image ??
                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(p.name)}`
              }
              title={p.name}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-muted-foreground text-sm">
          Categories
        </h3>
        {category ? (
          <Link
            className="flex w-fit items-center gap-2 rounded-full border bg-card px-3.5 py-0.5 text-card-foreground"
            href={`/${owner}/${repo}/category/${category.id}`}
          >
            <span className="text-lg">{category.emoji || "?"}</span>
            <span className="font-medium text-sm">{category.title}</span>
          </Link>
        ) : (
          <div className="relative overflow-hidden rounded-lg bg-muted px-3 py-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-lg">?</span>
              <span className="font-medium text-sm">Generating...</span>
            </div>
            <span className="-translate-x-full absolute inset-0 animate-[shimmer_2s_infinite] bg-linear-to-r from-transparent via-white/10 to-transparent" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1 text-muted-foreground">
          <GitBranchIcon className="size-4" />
          <span className="font-medium text-sm">main</span>
        </div>

        <div className="flex items-center gap-1 text-muted-foreground">
          <CommitIcon className="size-4" />
          <span className="font-medium text-sm">d8af6b2</span>
        </div>
      </div>
    </aside>
  )
}

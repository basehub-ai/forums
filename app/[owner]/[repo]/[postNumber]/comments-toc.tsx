"use client"

import { Suspense, useState } from "react"
import { RelativeTime } from "@/components/relative-time"
import { UserAvatar } from "@/components/user-avatar"
import type { AuthorInfo } from "./comment-thread"
import { useToc } from "./toc-context"

type CommentTocItem = {
  id: string
  commentNumber: string
  author: AuthorInfo
  createdAt: number
  isRoot: boolean
}

type CommentsTocProps = {
  items: CommentTocItem[]
}

export function CommentsToc({ items }: CommentsTocProps) {
  const [isHovered, setIsHovered] = useState(false)
  const { activeCommentId } = useToc()

  if (items.length === 0) return null

  function scrollToComment(commentNumber: string) {
    const el = document.getElementById(commentNumber)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <nav
      className="flex flex-col gap-0.5"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {items.map((item) => {
        const isActive = activeCommentId === item.commentNumber

        if (isHovered) {
          return (
            <button
              className={`group flex items-center gap-2 rounded px-1.5 py-1 text-left transition-colors ${
                isActive ? "bg-muted/30" : "hover:bg-muted/20"
              }`}
              key={item.id}
              onClick={() => scrollToComment(item.commentNumber)}
              type="button"
            >
              <div className="shrink-0">
                <UserAvatar
                  size={18}
                  src={item.author.image}
                  username={item.author.username}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className={`truncate text-xs ${isActive ? "font-medium text-bright" : "text-dim group-hover:text-bright"}`}
                >
                  {item.author.name}
                </div>
                <div className="text-faint text-xs">
                  <Suspense>
                    <RelativeTime timestamp={item.createdAt} />
                  </Suspense>
                </div>
              </div>
            </button>
          )
        }

        return (
          <button
            className="group flex items-center py-1.5"
            key={item.id}
            onClick={() => scrollToComment(item.commentNumber)}
            type="button"
          >
            <div
              className={`h-px transition-all ${
                isActive
                  ? "w-6 bg-bright"
                  : "w-3 bg-faint group-hover:w-4 group-hover:bg-muted"
              }`}
            />
          </button>
        )
      })}
    </nav>
  )
}

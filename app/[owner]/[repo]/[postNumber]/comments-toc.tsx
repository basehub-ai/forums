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
    <div
      className="hidden lg:block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <nav className="sticky top-20 flex flex-col gap-1">
        {items.map((item) => {
          const isActive = activeCommentId === item.commentNumber
          const actionLabel = item.isRoot ? "posted" : "commented"

          if (isHovered) {
            return (
              <button
                className="group flex items-center gap-2 py-1 text-left text-sm transition-colors"
                key={item.id}
                onClick={() => scrollToComment(item.commentNumber)}
                type="button"
              >
                <UserAvatar
                  size={16}
                  src={item.author.image}
                  username={item.author.username}
                />
                <span
                  className={`truncate ${isActive ? "font-medium text-bright" : "text-muted group-hover:text-dim"}`}
                >
                  {item.author.name}
                </span>
                <span className="shrink-0 text-faint text-xs">
                  {actionLabel}{" "}
                  <Suspense>
                    <RelativeTime timestamp={item.createdAt} />
                  </Suspense>
                </span>
              </button>
            )
          }

          return (
            <button
              className="group flex items-center py-1"
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
    </div>
  )
}

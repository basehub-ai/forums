"use client"

import { useToc } from "./toc-context"

export function HeadingsToc() {
  const { headings, activeHeadingId, activeCommentId } = useToc()

  const commentHeadings = headings.filter((h) =>
    h.id.startsWith(`${activeCommentId}-`)
  )

  if (commentHeadings.length === 0) return null

  function scrollToHeading(id: string) {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <div className="hidden lg:block">
      <nav className="sticky top-20 flex flex-col gap-0.5">
        <span className="mb-2 text-faint text-xs uppercase tracking-wide">
          On this comment
        </span>
        {commentHeadings.map((heading) => {
          const isActive = activeHeadingId === heading.id
          const indent = (heading.level - 1) * 12

          return (
            <button
              className={`group flex items-center py-0.5 text-left text-sm transition-colors ${
                isActive
                  ? "font-medium text-bright"
                  : "text-muted hover:text-dim"
              }`}
              key={heading.id}
              onClick={() => scrollToHeading(heading.id)}
              style={{ paddingLeft: indent }}
              type="button"
            >
              <span className="truncate">{heading.text}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

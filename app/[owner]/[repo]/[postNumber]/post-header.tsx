"use client"

import { Tooltip } from "@base-ui/react/tooltip"
import { TagIcon } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"
import { Subtitle, Title } from "@/components/typography"
import { usePostMetadata } from "./post-metadata-context"

export function PostHeader({
  owner,
  repo,
  postNumber,
}: {
  owner: string
  repo: string
  postNumber: number
}) {
  const { title, category, gitContext } = usePostMetadata()

  return (
    <header>
      <div className="flex items-center gap-1 text-muted-foreground text-sm">
        <Link className="hover:underline" href={`/${owner}/${repo}`}>
          <Subtitle>
            {owner}/{repo}
          </Subtitle>
        </Link>
        {category && (
          <>
            <Subtitle className="select-none">&gt;</Subtitle>
            <Link
              className="hover:underline"
              href={`/${owner}/${repo}/category/${category.id}`}
            >
              <Subtitle>{category.title}</Subtitle>
            </Link>
          </>
        )}
      </div>

      {typeof title === "string" ? (
        <Title className="mt-1">{title || `Post #${postNumber}`}</Title>
      ) : (
        <h1 className="relative mt-1 overflow-hidden font-medium text-2xl text-muted-foreground">
          <span>Generating title...</span>
          <span className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-linear-to-r from-transparent via-white/20 to-transparent" />
        </h1>
      )}

      {gitContext ? (
        <div className="mt-2 flex items-center gap-4 text-sm">
          <Link
            className="flex items-center gap-1 bg-highlight-blue px-1.5 py-0.5 font-medium text-white"
            href={`https://github.com/${owner}/${repo}/tree/${gitContext.branch}`}
            target="_blank"
          >
            {gitContext.branch}
          </Link>
          {gitContext.tags.length > 0 && (
            <Link
              className="flex items-center gap-1"
              href={`https://github.com/${owner}/${repo}/releases/tag/${gitContext.tags[0]}`}
              target="_blank"
            >
              <TagIcon className="h-3.5 w-3.5" />
              {gitContext.tags[0]}
            </Link>
          )}
          <div className="flex items-center gap-1">
            <Tooltip.Provider>
              <Tooltip.Root>
                <Tooltip.Trigger
                  render={
                    <Link
                      className="underline decoration-dotted underline-offset-2"
                      href={`https://github.com/${owner}/${repo}/commit/${gitContext.sha}`}
                      target="_blank"
                    >
                      {gitContext.sha.slice(0, 7)}
                    </Link>
                  }
                />
                <Tooltip.Portal>
                  <Tooltip.Positioner>
                    <Tooltip.Popup>
                      Exploring code at this commit.
                    </Tooltip.Popup>
                  </Tooltip.Positioner>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
            <span className="truncate">
              <CommitMessage
                message={gitContext.message}
                owner={owner}
                repo={repo}
              />
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-2 h-6 text-muted-foreground text-sm">Loading...</div>
      )}

      <StaleBanner />
    </header>
  )
}

function StaleBanner() {
  const { staleInfo, gitContext, owner, repo } = usePostMetadata()

  if (!(staleInfo && gitContext)) {
    return null
  }

  return (
    <div className="mt-4 border-faint border-l-2 bg-shade px-2 py-1 font-medium text-faint text-sm">
      This post might have stale content, as{" "}
      <Link
        className="underline hover:text-muted"
        href={`https://github.com/${owner}/${repo}/tree/${gitContext.branch}`}
        target="_blank"
      >
        {gitContext.branch}
      </Link>{" "}
      is{" "}
      <Link
        className="underline hover:text-muted"
        href={`https://github.com/${owner}/${repo}/compare/${gitContext.sha}...${gitContext.branch}`}
        target="_blank"
      >
        {staleInfo.commitsAhead} commit{staleInfo.commitsAhead !== 1 ? "s" : ""}{" "}
        ahead
      </Link>
      .
    </div>
  )
}

function CommitMessage({
  message,
  owner,
  repo,
}: {
  message: string
  owner: string
  repo: string
}) {
  const parts: ReactNode[] = []
  const regex = /#(\d+)/g
  let lastIndex = 0
  const matches = [...message.matchAll(regex)]

  for (const match of matches) {
    if (match.index > lastIndex) {
      parts.push(message.slice(lastIndex, match.index))
    }
    const prNumber = match[1]
    parts.push(
      <a
        className="text-highlight-blue hover:underline"
        href={`https://github.com/${owner}/${repo}/pull/${prNumber}`}
        key={match.index}
        onClick={(e) => e.stopPropagation()}
        rel="noopener noreferrer"
        target="_blank"
      >
        #{prNumber}
      </a>
    )
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < message.length) {
    parts.push(message.slice(lastIndex))
  }

  return <>{parts}</>
}

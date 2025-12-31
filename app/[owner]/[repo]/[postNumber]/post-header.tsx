"use client"

import { GitCommitHorizontalIcon, TagIcon } from "lucide-react"
import Link from "next/link"
import { usePostMetadata } from "./post-metadata-context"

export function PostHeader({ owner, repo }: { owner: string; repo: string }) {
  const { title, category } = usePostMetadata()

  return (
    <header>
      <div className="flex items-center gap-1 text-muted-foreground text-sm">
        <Link className="hover:underline" href={`/${owner}/${repo}`}>
          {owner}/{repo}
        </Link>
        {category && (
          <>
            <span>&gt;</span>
            <Link
              className="hover:underline"
              href={`/${owner}/${repo}/category/${category.id}`}
            >
              {category.title}
            </Link>
          </>
        )}
      </div>

      {title ? (
        <h1 className="mt-1 font-medium text-2xl text-bright underline decoration-1 underline-offset-4">
          {title}
        </h1>
      ) : (
        <h1 className="relative mt-1 overflow-hidden font-medium text-2xl text-muted-foreground">
          <span>Generating title...</span>
          <span className="-translate-x-full absolute inset-0 animate-[shimmer_2s_infinite] bg-linear-to-r from-transparent via-white/20 to-transparent" />
        </h1>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs">
        <span className="rounded bg-accent px-1.5 py-0.5 font-medium text-label">
          canary
        </span>
        <span className="flex items-center gap-1">
          <TagIcon className="size-3" />
          15.6.1
        </span>
        <Link
          className="flex items-center gap-1 hover:underline"
          href="#"
          title="View commit"
        >
          <GitCommitHorizontalIcon className="size-3" />
          <span className="underline">c68d18c</span>
          <span className="max-w-xs truncate">
            fix(examples): resolve hydration mismatch in blog-starter (#87703)
          </span>
        </Link>
      </div>

      <StaleBanner />
    </header>
  )
}

function StaleBanner() {
  return (
    <div className="mt-4 border-l-2 border-accent bg-accent/5 px-3 py-2 text-muted-foreground text-sm">
      This post might have stale content, as the canary branch is{" "}
      <span className="underline">1 major version</span> and{" "}
      <span className="underline">4 commits</span> ahead.
      <span className="ml-2 inline-flex gap-2">
        <button
          className="rounded border border-border-solid bg-background px-2 py-0.5 text-xs hover:bg-shade-hover"
          type="button"
        >
          Re-run
        </button>
        <button
          className="rounded border border-border-solid bg-background px-2 py-0.5 text-xs hover:bg-shade-hover"
          type="button"
        >
          Auto re-run
        </button>
      </span>
    </div>
  )
}

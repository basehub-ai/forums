"use client"

import Link from "next/link"
import type { StoredThreadClient } from "@/lib/redis"
import { useAgentStore } from "./[threadId]/agent-store"

export function ActiveThreads({
  threads,
  owner,
  repo,
}: {
  threads: StoredThreadClient[]
  owner: string
  repo: string
}) {
  const isActive = useAgentStore((state) => state.messages.length)

  if (isActive) {
    return null
  }

  if (threads.length === 0) {
    return null
  }

  return (
    <div className="mx-auto mt-8 w-full max-w-4xl px-4">
      <h2 className="mb-4 font-semibold text-lg">Threads</h2>
      <div className="space-y-2">
        {threads.map((thread) => (
          <Link
            className="block rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
            href={`/${owner}/${repo}/${thread.id}`}
            key={thread.id}
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="font-medium">
                  {thread.title || `Thread ${thread.id.slice(0, 8)}`}
                </span>
                {!thread.title && (
                  <span className="text-muted-foreground text-xs">
                    {thread.id}
                  </span>
                )}
              </div>
              {!!thread.streamId && (
                <span className="text-muted-foreground text-xs">
                  streaming...
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

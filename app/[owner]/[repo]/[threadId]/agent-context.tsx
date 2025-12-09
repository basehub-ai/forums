"use client"

import { Suspense } from "react"
import type { ClientThread } from "@/lib/db/threads"
import { AgentSetter } from "./agent-setter"
import { AgentStoreProvider } from "./agent-store"

export function AgentProvider({
  thread,
  children,
}: {
  thread?: ClientThread
  children: React.ReactNode
}) {
  return (
    <AgentStoreProvider>
      <Suspense>
        <AgentSetter thread={thread} />
      </Suspense>
      {children}
    </AgentStoreProvider>
  )
}

"use client"

import type { StoredThreadClient } from "@/lib/redis"
import { AgentSetter } from "./agent-setter"
import { AgentStoreProvider } from "./agent-store"

export function AgentProvider({
  thread,
  children,
}: {
  thread?: StoredThreadClient
  children: React.ReactNode
}) {
  return (
    <AgentStoreProvider>
      <AgentSetter thread={thread} />
      {children}
    </AgentStoreProvider>
  )
}

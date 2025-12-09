/** biome-ignore-all lint/suspicious/noEmptyBlockStatements: . */
"use client"

import * as React from "react"
import { createStore, useStore } from "zustand"
import type { AgentUIMessage } from "@/agent/types"
import type { useAgent } from "./use-agent"

type AgentState = {
  threadId: string
  messages: AgentUIMessage[]
  sendMessages: ReturnType<typeof useAgent>["sendMessages"]
  queue: ReturnType<typeof useAgent>["queue"]
  status: ReturnType<typeof useAgent>["status"]
  removeFromQueue: ReturnType<typeof useAgent>["removeFromQueue"]
}

type AgentActions = {
  setAgentState: (state: AgentState) => void
}

type AgentStore = AgentState & AgentActions

const createAgentStore = () => {
  return createStore<AgentStore>((set) => ({
    threadId: "",
    messages: [],
    sendMessages: async () => {},
    queue: [],
    status: "ready" as const,
    removeFromQueue: () => {},
    setAgentState: (state) => set(state),
  }))
}

type AgentStoreType = ReturnType<typeof createAgentStore>

const AgentStoreContext = React.createContext<AgentStoreType | null>(null)

export function AgentStoreProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const storeRef = React.useRef<AgentStoreType>(null)

  if (!storeRef.current) {
    storeRef.current = createAgentStore()
  }

  return (
    <AgentStoreContext.Provider value={storeRef.current}>
      {children}
    </AgentStoreContext.Provider>
  )
}

export function useAgentStore<T>(selector: (state: AgentStore) => T): T {
  const store = React.useContext(AgentStoreContext)
  if (!store) {
    throw new Error("useAgentStore must be used within AgentStoreProvider")
  }
  return useStore(store, selector)
}

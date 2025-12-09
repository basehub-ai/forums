"use client"

import { useParams } from "next/navigation"
import * as React from "react"
import type { ClientThread } from "@/lib/db/threads"
import { getModel } from "@/lib/models"
import { useAgentStore } from "./agent-store"
import { useAgent } from "./use-agent"

export function AgentSetter({ thread }: { thread?: ClientThread }) {
  const [model] = React.useState(getModel().value)
  const { owner, repo } = useParams<{ owner: string; repo: string }>()
  const agentState = useAgent({
    thread,
    model,
    basePath: `/${owner}/${repo}`,
    gitContext: { owner, repo },
  })

  const setAgentState = useAgentStore((state) => state.setAgentState)

  React.useEffect(() => {
    setAgentState(agentState)
  }, [agentState, setAgentState])

  return null
}

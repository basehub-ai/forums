import type { UIMessage } from "ai"

export type AgentMode = "ask" | "build"

export type AgentUIMessage = UIMessage<{
  errorCode?: number
  mode?: AgentMode
}>

export type GitContextData = {
  sha: string
  branch: string
  tags: string[]
  message: string
  date: string
}

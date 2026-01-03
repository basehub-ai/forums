import type { UIMessage } from "ai"

export type AgentUIMessage = UIMessage<{ errorCode?: number }>

export type GitContextData = {
  sha: string
  branch: string
  tags: string[]
  message: string
  date: string
}

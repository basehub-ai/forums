import type { UIMessage } from "ai"

export type AssistantMetadata = {
  model: string
}

export type AgentUIMessage = UIMessage<{
  ts: number
  assistant?: AssistantMetadata
}>

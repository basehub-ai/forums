import type { UIMessage } from "ai"

export type AgentUIMessage = UIMessage<{ errorCode?: number }>

export type GitContextData = {
  sha: string
  branch: string
  tags: string[]
  message: string
  date: string
}

export type NoAnswerReason = "not-a-question" | "unclear" | "needs-more-context"

export type PostAnswer =
  | { type: "answer"; text: string; updatedAt: number }
  | { type: "no-answer"; reason: NoAnswerReason; updatedAt: number }

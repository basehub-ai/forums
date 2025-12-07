import {
  convertToModelMessages,
  type FinishReason,
  streamText,
  type UIMessageChunk,
} from "ai"
import { nanoid } from "nanoid"
import { defineHook, getWritable } from "workflow"
import {
  clearStreamIdIf,
  getMessages,
  pushMessages,
  redis,
  type StoredInterrupt,
} from "@/lib/redis"
import { getTools } from "./tools"
import type { AgentUIMessage } from "./types"
import { getWorkspace } from "./workspace"

const system = "You are an AI assistant. Help the user with their requests."

type FinishReasonWithInterrupt =
  | FinishReason
  | "interrupted-mid-stream"
  | "interrupted-before-stream"

export type GitContext = {
  owner: string
  repo: string
  ref?: string
}

export type AgentEvent = { now: number; gitContext: GitContext } & {
  type: "user-message"
}

export const agentHook = defineHook<AgentEvent>()

export async function agent({
  model,
  threadId,
  initialEvent,
}: {
  model: string
  threadId: string
  initialEvent: AgentEvent
}) {
  "use workflow"

  const hook = agentHook.create({ token: threadId })

  await onAgentEvent(initialEvent, { threadId, model })

  for await (const event of hook) {
    await onAgentEvent(event, { threadId, model })
  }
}

async function onAgentEvent(
  event: AgentEvent,
  { threadId, model }: { threadId: string; model: string }
) {
  const streamId = String(event.now)
  const writable = getWritable({ namespace: streamId })

  const interruptedBeforeStream = await hasInterruptStep({
    threadId,
    since: event.now,
  })

  let finishReason: FinishReasonWithInterrupt | undefined
  let sandboxId: string | null = null
  if (!interruptedBeforeStream) {
    let stepCount = 0
    while (
      finishReason !== "stop" &&
      finishReason !== "interrupted-mid-stream" &&
      finishReason !== "interrupted-before-stream" &&
      stepCount < 100
    ) {
      const result = await streamTextStep({
        model,
        threadId,
        writable,
        now: event.now,
        stepCount,
        sandboxId,
        gitContext: event.gitContext,
      })
      finishReason = result.finishReason
      sandboxId = result.sandboxId
      stepCount += 1
    }
  }

  await closeStreamStep({
    writable,
    chatId: threadId,
    now: event.now,
    writeInterruptionMessage: finishReason === "interrupted-mid-stream",
  })
}

async function hasInterruptStep({
  threadId,
  since,
}: {
  threadId: string
  since: number
}): Promise<boolean> {
  "use step"
  const interrupt = await redis.get<StoredInterrupt>(`interrupt:${threadId}`)
  if (!interrupt || interrupt.timestamp < since) {
    return false
  }
  return true
}

async function closeStreamStep({
  writable,
  chatId,
  writeInterruptionMessage,
  now,
}: {
  writable: WritableStream<UIMessageChunk>
  chatId: string
  writeInterruptionMessage?: boolean
  now: number
}) {
  "use step"

  const interruptionMessageId = `interruption-${now}`
  const interruptionMessage = "[interrupted by user]"
  if (writeInterruptionMessage) {
    const writer = writable.getWriter()
    writer.write({ id: interruptionMessageId, type: "text-start" })
    writer.write({
      id: interruptionMessageId,
      type: "text-delta",
      delta: interruptionMessage,
    })
    writer.write({ id: interruptionMessageId, type: "text-end" })
    writer.releaseLock()
  }

  await Promise.all([
    writable.close(),
    writeInterruptionMessage
      ? pushMessages(chatId, [
          {
            id: interruptionMessageId,
            role: "assistant" as const,
            parts: [{ type: "text" as const, text: interruptionMessage }],
          },
        ])
      : Promise.resolve(),
    clearStreamIdIf(chatId, String(now)),
  ])
}

async function streamTextStep({
  model,
  threadId,
  writable,
  now,
  stepCount,
  gitContext,
  sandboxId,
}: {
  model: string
  threadId: string
  writable: WritableStream<UIMessageChunk>
  now: number
  stepCount: number
  gitContext: GitContext
  sandboxId: string | null
}): Promise<{ finishReason: FinishReasonWithInterrupt; sandboxId: string }> {
  "use step"

  const [uiMessages, interrupted, workspace] = await Promise.all([
    getMessages(threadId),
    hasInterruptStep({ threadId, since: now }),
    getWorkspace({ sandboxId, gitContext }),
  ])

  if (interrupted) {
    return {
      finishReason:
        stepCount === 0
          ? "interrupted-before-stream"
          : "interrupted-mid-stream",
      sandboxId: workspace.sandbox.sandboxId,
    }
  }

  const result = streamText({
    messages: convertToModelMessages(uiMessages),
    tools: getTools({ workspace }),
    system,
    model,
  })

  const ts = Date.now()
  await result
    .toUIMessageStream({
      onFinish: async ({ messages: newMessages }) => {
        const toAdd = newMessages.map(
          (m, i) =>
            ({
              ...m,
              id: m.id || nanoid(),
              metadata: { ts: ts + i, assistant: { model } },
            }) satisfies AgentUIMessage
        )
        await pushMessages(threadId, toAdd)
      },
    })
    .pipeTo(writable, { preventClose: true })

  return {
    finishReason: await result.finishReason,
    sandboxId: workspace.sandbox.sandboxId,
  }
}

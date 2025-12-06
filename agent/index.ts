import {
  convertToModelMessages,
  type FinishReason,
  streamText,
  type UIMessageChunk,
} from "ai";
import { nanoid } from "nanoid";
import { defineHook, getWritable } from "workflow";
import {
  clearStreamIdIf,
  getMessages,
  pushMessages,
  redis,
  type StoredInterrupt,
} from "@/lib/redis";
import { getTools } from "./tools";

const system = "You are an AI assistant. Help the user with their requests.";

type FinishReasonWithInterrupt =
  | FinishReason
  | "interrupted-mid-stream"
  | "interrupted-before-stream";

export type AgentEvent = { now: number } & { type: "user-message" };

export const agentHook = defineHook<AgentEvent>();

export async function agent({
  model,
  chatId,
  initialEvent,
}: {
  model: string;
  chatId: string;
  initialEvent: AgentEvent;
}) {
  "use workflow";

  const hook = agentHook.create({ token: chatId });

  await onAgentEvent(initialEvent, { chatId, model });

  for await (const event of hook) {
    await onAgentEvent(event, { chatId, model });
  }
}

async function onAgentEvent(
  event: AgentEvent,
  { chatId, model }: { chatId: string; model: string }
) {
  const streamId = String(event.now);
  const writable = getWritable({ namespace: streamId });

  const interruptedBeforeStream = await hasInterruptStep({
    chatId,
    since: event.now,
  });

  let finishReason: FinishReasonWithInterrupt | undefined;
  if (!interruptedBeforeStream) {
    let stepCount = 0;
    while (
      finishReason !== "stop" &&
      finishReason !== "interrupted-mid-stream" &&
      finishReason !== "interrupted-before-stream" &&
      stepCount < 100
    ) {
      const result = await streamTextStep({
        model,
        chatId,
        writable,
        now: event.now,
        stepCount,
      });
      finishReason = result.finishReason;
      stepCount += 1;
    }
  }

  await closeStreamStep({
    writable,
    chatId,
    now: event.now,
    writeInterruptionMessage: finishReason === "interrupted-mid-stream",
  });
}

async function hasInterruptStep({
  chatId,
  since,
}: {
  chatId: string;
  since: number;
}): Promise<boolean> {
  "use step";
  const interrupt = await redis.get<StoredInterrupt>(`interrupt:${chatId}`);
  if (!interrupt || interrupt.timestamp < since) {
    return false;
  }
  return true;
}

async function closeStreamStep({
  writable,
  chatId,
  writeInterruptionMessage,
  now,
}: {
  writable: WritableStream<UIMessageChunk>;
  chatId: string;
  writeInterruptionMessage?: boolean;
  now: number;
}) {
  "use step";

  const interruptionMessageId = `interruption-${now}`;
  const interruptionMessage = "[interrupted by user]";
  if (writeInterruptionMessage) {
    const writer = writable.getWriter();
    writer.write({ id: interruptionMessageId, type: "text-start" });
    writer.write({
      id: interruptionMessageId,
      type: "text-delta",
      delta: interruptionMessage,
    });
    writer.write({ id: interruptionMessageId, type: "text-end" });
    writer.releaseLock();
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
  ]);
}

async function streamTextStep({
  model,
  chatId,
  writable,
  now,
  stepCount,
}: {
  model: string;
  chatId: string;
  writable: WritableStream<UIMessageChunk>;
  now: number;
  stepCount: number;
}): Promise<{ finishReason: FinishReasonWithInterrupt }> {
  "use step";

  const [uiMessages, interrupted] = await Promise.all([
    getMessages(chatId),
    hasInterruptStep({ chatId, since: now }),
  ]);
  if (interrupted) {
    return {
      finishReason:
        stepCount === 0
          ? "interrupted-before-stream"
          : "interrupted-mid-stream",
    };
  }

  const result = streamText({
    messages: convertToModelMessages(uiMessages),
    tools: getTools(),
    system,
    model,
  });

  await result
    .toUIMessageStream({
      onFinish: async ({ messages: newMessages }) => {
        const toAdd = newMessages.map((m) => ({ ...m, id: m.id || nanoid() }));
        await pushMessages(chatId, toAdd);
      },
    })
    .pipeTo(writable, { preventClose: true });

  return { finishReason: await result.finishReason };
}

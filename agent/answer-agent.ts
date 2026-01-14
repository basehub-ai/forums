import { stepCountIs, streamText, tool } from "ai"
import { eq } from "drizzle-orm"
import { updateTag } from "next/cache"
import { z } from "zod"
import { db } from "@/lib/db/client"
import { posts } from "@/lib/db/schema"
import { getSiteOrigin } from "@/lib/utils"
import type { NoAnswerReason, PostAnswer } from "./types"

export async function runAnswerAgent({
  postId,
  owner,
  repo,
  postNumber,
  currentAnswer,
}: {
  postId: string
  owner: string
  repo: string
  postNumber: number
  currentAnswer?: PostAnswer | null
}) {
  const result: { answer?: PostAnswer } = {}

  const llmsTxtUrl = `${getSiteOrigin()}/${owner}/${repo}/${postNumber}/llms.txt`

  let transcript: string
  try {
    const res = await fetch(llmsTxtUrl)
    if (!res.ok) {
      console.error("Failed to fetch llms.txt:", res.status)
      return
    }
    transcript = await res.text()
  } catch (err) {
    console.error("Failed to fetch llms.txt:", err)
    return
  }

  const currentAnswerContext = currentAnswer
    ? currentAnswer.type === "answer"
      ? `\n\nYour previous answer was:\n${currentAnswer.text}\n\nReview if this is still accurate given any new comments.`
      : `\n\nYou previously determined this was not a question (reason: ${currentAnswer.reason}).`
    : ""

  const systemPrompt = `You are a forum answer assistant. Your job is to analyze a forum post transcript and determine the best answer to the original question (the first comment in the post).

Rules:
- Focus on answering the ORIGINAL question (first comment) - the post may have evolved but we want to answer what was initially asked
- If the post contains a clear answer to the original question (from any participant), use SetAnswer with a concise summary
- If the post is NOT a question (it's an announcement, discussion, or purely informational), use SetNoAnswer with reason "not-a-question"
- If the question is unclear or cannot be answered from the available context, use SetNoAnswer with reason "unclear" or "needs-more-context"
- Be extremely concise in your answer - summarize the key points without unnecessary verbosity
- Only call ONE tool: either SetAnswer OR SetNoAnswer${currentAnswerContext}`

  const tools: Parameters<typeof streamText>[0]["tools"] = {
    SetAnswer: tool({
      description:
        "Set the answer to the original question. Use when a clear answer exists in the transcript.",
      inputSchema: z.object({
        text: z
          .string()
          .describe(
            "Concise answer to the original question, summarizing the key points"
          ),
      }),
      // biome-ignore lint/suspicious/useAwait: .
      execute: async (params) => {
        result.answer = {
          type: "answer",
          text: params.text,
          updatedAt: Date.now(),
        }
        return { ok: true }
      },
    }),
    SetNoAnswer: tool({
      description:
        "Indicate that no answer can be provided. Use when the post is not a question or lacks enough context.",
      inputSchema: z.object({
        reason: z
          .enum(["not-a-question", "unclear", "needs-more-context"])
          .describe("Why no answer can be provided"),
      }),
      // biome-ignore lint/suspicious/useAwait: .
      execute: async (params) => {
        result.answer = {
          type: "no-answer",
          reason: params.reason as NoAnswerReason,
          updatedAt: Date.now(),
        }
        return { ok: true }
      },
    }),
  }

  const stream = streamText({
    model: "anthropic/claude-haiku-4.5",
    system: systemPrompt,
    prompt: `Here's the full post transcript:\n\n${transcript}`,
    tools,
    stopWhen: stepCountIs(3),
  })

  await stream.finishReason

  if (!result.answer) {
    console.log("Answer agent did not produce an answer")
    return
  }

  await db
    .update(posts)
    .set({ answer: result.answer, updatedAt: Date.now() })
    .where(eq(posts.id, postId))

  updateTag(`repo:${owner}:${repo}`)
  updateTag(`post:${postId}`)
}

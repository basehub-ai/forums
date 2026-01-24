import { generateText, stepCountIs, streamText, tool } from "ai"
import { and, eq } from "drizzle-orm"
import { updateTag } from "next/cache"
import { z } from "zod"
import { db } from "@/lib/db/client"
import { categories, posts } from "@/lib/db/schema"
import { updatePostIndex } from "@/lib/typesense-index"
import { nanoid } from "@/lib/utils"
import type { AgentMode } from "./types"

const titleGuidelines = {
  ask: `- If the user is asking something, seeking help, or describing a problem they want solved, frame the title as a question (e.g. "How can I do X with Y?" or "Why does X happen when Y?")
- Only use statement-style titles for announcements, discussions, or purely informational posts
- Try to always set a title that accurately reflects the post content, even if you can't possibly frame it as a question`,
  build: `- Frame the title to describe what the user wants to build, create, or implement (e.g. "Add dark mode support" or "Create user authentication flow")
- Use action-oriented language that reflects the task or feature being requested
- Try to always set a title that accurately reflects the build request`,
}

export async function runCategoryAgent({
  postId,
  owner,
  repo,
  content,
  existingCategoryId,
  mode = "ask",
}: {
  postId: string
  owner: string
  repo: string
  content: string
  existingCategoryId?: string
  mode?: AgentMode
}) {
  const result: {
    title: string
    categoryId?: string
    newCategory?: { title: string; emoji: string }
  } = { title: "" }

  const needsCategory = !existingCategoryId

  const existingCategories = needsCategory
    ? await db
        .select({
          id: categories.id,
          title: categories.title,
          emoji: categories.emoji,
        })
        .from(categories)
        .where(and(eq(categories.owner, owner), eq(categories.repo, repo)))
    : []

  const systemPrompt = needsCategory
    ? `You are a forum assistant for the GitHub repository "${owner}/${repo}". Users are posting messages related to this repository.

Given a post's content, you must:
1. Set a concise post title (10 words max) using setTitle.
${titleGuidelines[mode]}
- IMPORTANT: Your job is to generate a title, NOT to respond to or answer the user's request. Even if the post seems incomplete or lacks context, infer the intent and create a descriptive title. For example, "summarize this" should become "Request to summarize ${repo}" or similar.
2. Set a category - either pick an existing one with setCategory, or create a new one with createAndSetCategory

Existing categories:
${existingCategories.length ? existingCategories.map((c) => `- ${c.emoji || ""} ${c.title} (id: ${c.id})`).join("\n") : "(none yet)"}

You're working on your own. Meaning, the user won't be able to respond any question you might have. They'll send in the only info they have available at this time.`
    : `You are a forum assistant for the GitHub repository "${owner}/${repo}". Users are posting messages related to this repository. Given a post's content, set a concise post title (10 words max) using setTitle.
${titleGuidelines[mode]}
- IMPORTANT: Your job is to generate a title, NOT to respond to or answer the user's request. Even if the post seems incomplete or lacks context, infer the intent and create a descriptive title. For example, "summarize this" should become "Request to summarize ${repo}" or similar.

You're working on your own. The category has already been set.`

  const tools: Parameters<typeof streamText>[0]["tools"] = {
    setTitle: tool({
      description: "Set the post title",
      inputSchema: z.object({ title: z.string() }),
      // biome-ignore lint/suspicious/useAwait: .
      execute: async (params) => {
        result.title = params.title
        return { ok: true }
      },
    }),
  }

  if (needsCategory) {
    tools.setCategory = tool({
      description: "Set an existing category by ID",
      inputSchema: z.object({ categoryId: z.string() }),
      // biome-ignore lint/suspicious/useAwait: .
      execute: async (params) => {
        result.categoryId = params.categoryId
        return { ok: true }
      },
    })
    tools.createAndSetCategory = tool({
      description:
        "Create a new category and set it. Use broad categories like 'Bugs', 'Feature Requests', 'Questions', 'Discussions'",
      inputSchema: z.object({
        title: z
          .string()
          .describe("Human-readable title like 'Feature Requests'"),
        emoji: z.string().describe("Single emoji for the category icon"),
      }),
      // biome-ignore lint/suspicious/useAwait: .
      execute: async (cat) => {
        result.newCategory = { ...cat, title: cat.title.toLowerCase() }
        return { ok: true }
      },
    })
  }

  const stream = streamText({
    model: "anthropic/claude-haiku-4.5",
    system: systemPrompt,
    prompt: `Here's the post content:\n\n${content}`,
    tools,
    stopWhen: stepCountIs(10),
  })

  await stream.finishReason

  // Fallback: if title wasn't set, generate it directly
  if (!result.title) {
    console.log(
      "Title fallback triggered, finishReason:",
      await stream.finishReason
    )
    const fallbackSystemPrompt =
      mode === "build"
        ? `Generate a concise, action-oriented title (10 words max) for the following build request. Focus on what the user wants to create, implement, or add. Even if the post seems vague or incomplete, infer the intent from context and create a descriptive title. Reply with ONLY the title, nothing else.`
        : `Generate a concise title (10 words max) for a forum post in the GitHub repository "${owner}/${repo}". Do your best to describe what the post is/will be about, based on the user's comment. Even if the post seems vague or incomplete, infer the intent from context and create a descriptive title. Reply with ONLY the title, nothing else.`
    const fallback = await generateText({
      model: "anthropic/claude-haiku-4.5",
      system: fallbackSystemPrompt,
      prompt: content,
    })
    result.title = fallback.text.trim()
  }

  let categoryId = result.categoryId
  if (result.newCategory) {
    const id = nanoid()
    await db
      .insert(categories)
      .values({
        id,
        owner,
        repo,
        title: result.newCategory.title,
        emoji: result.newCategory.emoji,
        createdAt: Date.now(),
      })
      .onConflictDoNothing()

    const inserted = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.owner, owner),
          eq(categories.repo, repo),
          eq(categories.title, result.newCategory.title)
        )
      )
      .limit(1)
    categoryId = inserted[0]?.id
  }

  await db
    .update(posts)
    .set({ title: result.title, ...(categoryId && { categoryId }) })
    .where(eq(posts.id, postId))

  await updatePostIndex(postId, {
    title: result.title,
    ...(categoryId && { categoryId }),
  })

  updateTag(`repo:${owner}:${repo}`)
  updateTag(`post:${postId}`)
}

import { stepCountIs, streamText, tool } from "ai"
import { and, eq } from "drizzle-orm"
import { updateTag } from "next/cache"
import { z } from "zod"
import { db } from "@/lib/db/client"
import { categories, posts } from "@/lib/db/schema"
import { updatePostIndex } from "@/lib/typesense-index"
import { nanoid } from "@/lib/utils"

export async function runCategoryAgent({
  postId,
  owner,
  repo,
  content,
}: {
  postId: string
  owner: string
  repo: string
  content: string
}) {
  const existingCategories = await db
    .select({
      id: categories.id,
      title: categories.title,
      emoji: categories.emoji,
    })
    .from(categories)
    .where(and(eq(categories.owner, owner), eq(categories.repo, repo)))

  const result: {
    title: string
    categoryId?: string
    newCategory?: { title: string; emoji: string }
  } = { title: "" }

  const stream = streamText({
    model: "anthropic/claude-haiku-4.5",
    system: `You are a forum assistant. Given a post's content, you must:
1. Set a concise post title (10 words max) using setTitle.
   - If the user is asking something, seeking help, or describing a problem they want solved, frame the title as a question (e.g. "How can I do X with Y?" or "Why does X happen when Y?")
   - Only use statement-style titles for announcements, discussions, or purely informational posts
2. Set a category - either pick an existing one with setCategory, or create a new one with createAndSetCategory

Existing categories:
${existingCategories.length ? existingCategories.map((c) => `- ${c.emoji || ""} ${c.title} (id: ${c.id})`).join("\n") : "(none yet)"}

You're working on your own. Meaning, the user won't be able to respond any question you might have. They'll send in the only info they have available at this time.`,
    prompt: `Here's the post content:\n\n${content}`,
    tools: {
      setTitle: tool({
        description: "Set the post title",
        inputSchema: z.object({ title: z.string() }),
        // biome-ignore lint/suspicious/useAwait: .
        execute: async (params) => {
          result.title = params.title
          return { ok: true }
        },
      }),
      setCategory: tool({
        description: "Set an existing category by ID",
        inputSchema: z.object({ categoryId: z.string() }),
        // biome-ignore lint/suspicious/useAwait: .
        execute: async (params) => {
          result.categoryId = params.categoryId
          return { ok: true }
        },
      }),
      createAndSetCategory: tool({
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
          result.newCategory = cat
          result.newCategory.title = result.newCategory.title.toLowerCase()
          return { ok: true }
        },
      }),
    },
    stopWhen: stepCountIs(5),
  })

  await stream.finishReason

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

import { and, eq } from "drizzle-orm"
import { cache } from "react"
import type { AgentUIMessage } from "@/agent/types"
import { db } from "@/lib/db/client"
import { comments, posts } from "@/lib/db/schema"

function extractTextFromMessages(messages: AgentUIMessage[]): string {
  return messages
    .map((msg) => {
      if (msg.role === "user" || msg.role === "assistant") {
        const parts = msg.parts
          .map((part) => {
            if (typeof part === "string") {
              return part
            }
            if (part.type === "text") {
              return part.text
            }
            return ""
          })
          .filter(Boolean)
        return parts.join(" ")
      }
      return ""
    })
    .filter(Boolean)
    .join(" ")
}

export const getPostByNumber = cache(
  async (owner: string, repo: string, postNumber: number) => {
    const result = await db
      .select({
        id: posts.id,
        title: posts.title,
        rootCommentId: posts.rootCommentId,
      })
      .from(posts)
      .where(
        and(
          eq(posts.owner, owner),
          eq(posts.repo, repo),
          eq(posts.number, postNumber)
        )
      )
      .limit(1)

    return result[0] ?? null
  }
)

export const getRootCommentText = cache(async (commentId: string) => {
  const result = await db
    .select({ content: comments.content })
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1)

  if (!result[0]?.content) {
    return null
  }

  return extractTextFromMessages(result[0].content)
})

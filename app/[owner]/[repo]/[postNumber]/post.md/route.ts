import { and, asc, eq } from "drizzle-orm"
import { notFound } from "next/navigation"
import type { AgentUIMessage } from "@/agent/types"
import { gitHubUserLoader } from "@/lib/auth"
import { db } from "@/lib/db/client"
import { categories, comments, llmUsers, posts } from "@/lib/db/schema"

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString()
}

function convertMessagesToMarkdown(messages: AgentUIMessage[]): string {
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
            if (part.type === "image") {
              return `![Image](${part.image})`
            }
            return ""
          })
          .filter(Boolean)
        return parts.join("\n\n")
      }
      return ""
    })
    .filter(Boolean)
    .join("\n\n")
}

export async function GET(
  request: Request,
  context: { params: Promise<{ owner: string; repo: string; postNumber: string }> }
) {
  const { owner, repo, postNumber: postNumberStr } = await context.params
  const postNumber = Number.parseInt(postNumberStr, 10)

  if (Number.isNaN(postNumber)) {
    notFound()
  }

  const [postWithCategory, allLlmUsers, postComments] = await Promise.all([
    db
      .select({
        id: posts.id,
        number: posts.number,
        owner: posts.owner,
        repo: posts.repo,
        title: posts.title,
        categoryId: posts.categoryId,
        rootCommentId: posts.rootCommentId,
        authorId: posts.authorId,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        category: {
          id: categories.id,
          title: categories.title,
          emoji: categories.emoji,
        },
      })
      .from(posts)
      .leftJoin(categories, eq(posts.categoryId, categories.id))
      .where(
        and(
          eq(posts.owner, owner),
          eq(posts.repo, repo),
          eq(posts.number, postNumber)
        )
      )
      .limit(1)
      .then((r) => r[0]),
    db.select().from(llmUsers),
    db
      .select()
      .from(comments)
      .innerJoin(posts, eq(comments.postId, posts.id))
      .where(
        and(
          eq(posts.owner, owner),
          eq(posts.repo, repo),
          eq(posts.number, postNumber)
        )
      )
      .orderBy(asc(comments.createdAt))
      .then((r) => r.map((row) => row.comments)),
  ])

  if (!postWithCategory) {
    notFound()
  }

  const { category, ...post } = postWithCategory

  const llmUsersById = Object.fromEntries(allLlmUsers.map((u) => [u.id, u]))

  const humanAuthors: { authorId: string; username: string }[] = []
  const llmAuthorIds = new Set<string>()
  for (const c of postComments) {
    if (c.authorId.startsWith("llm_")) {
      llmAuthorIds.add(c.authorId)
    } else if (c.authorUsername) {
      humanAuthors.push({ authorId: c.authorId, username: c.authorUsername })
    }
  }

  const uniqueHumanUsernames = [...new Set(humanAuthors.map((a) => a.username))]
  const humanUsersByUsername = Object.fromEntries(
    await Promise.all(
      uniqueHumanUsernames.map(async (username) => {
        const user = await gitHubUserLoader.load(username)
        return [username, user] as const
      })
    )
  )

  const authorsById: Record<
    string,
    { name: string; username: string; isLlm: boolean }
  > = {}

  for (const { authorId, username } of humanAuthors) {
    if (authorsById[authorId]) {
      continue
    }
    const user = humanUsersByUsername[username]
    if (user) {
      authorsById[authorId] = {
        name: user.name,
        username,
        isLlm: false,
      }
    }
  }

  for (const llmId of llmAuthorIds) {
    const llm = llmUsersById[llmId]
    if (llm) {
      authorsById[llmId] = {
        name: llm.name,
        username: llm.model,
        isLlm: true,
      }
    }
  }

  const categoryText = category?.emoji
    ? `${category.emoji} ${category.title}`
    : category?.title || "Uncategorized"

  let markdown = `# ${post.title || "Untitled"}\n\n`
  markdown += `**Repository:** ${owner}/${repo}\n`
  markdown += `**Post Number:** #${post.number}\n`
  markdown += `**Category:** ${categoryText}\n`
  markdown += `**Created:** ${formatTimestamp(post.createdAt)}\n`
  markdown += `**Updated:** ${formatTimestamp(post.updatedAt)}\n\n`
  markdown += "---\n\n"

  for (const comment of postComments) {
    const author = authorsById[comment.authorId]
    const authorLabel = author?.isLlm
      ? `${author.name} (AI)`
      : author?.name || "Unknown"

    markdown += `## ${authorLabel}\n\n`
    markdown += `*Posted at ${formatTimestamp(comment.createdAt)}*\n\n`

    const content = convertMessagesToMarkdown(comment.content)
    markdown += `${content}\n\n`
    markdown += "---\n\n"
  }

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  })
}

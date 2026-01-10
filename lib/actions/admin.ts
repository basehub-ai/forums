"use server"

import { eq, inArray, isNull, or } from "drizzle-orm"
import { nanoid } from "nanoid"
import { revalidatePath, revalidateTag } from "next/cache"
import { headers } from "next/headers"
import { auth, isAdmin } from "@/lib/auth"
import { db } from "@/lib/db/client"
import { comments, llmUsers, mentions, posts, reactions } from "@/lib/db/schema"
import { deletePostFromIndex } from "@/lib/typesense-index"

async function assertAdmin() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!isAdmin(session?.user)) {
    throw new Error("Unauthorized")
  }
}

export async function createLlmUser(data: {
  name: string
  model: string
  provider: string
  image?: string
}) {
  await assertAdmin()

  await db.insert(llmUsers).values({
    id: `llm_${nanoid()}`,
    name: data.name,
    model: data.model,
    provider: data.provider,
    image: data.image,
    isDefault: false,
    isInModelPicker: true,
    createdAt: Date.now(),
  })

  revalidatePath("/admin/llm-users")
  revalidateTag("models-list", "max")
}

export async function updateLlmUser(
  id: string,
  data: {
    name?: string
    model?: string
    provider?: string
    image?: string
    isInModelPicker?: boolean
    billing_category?: string
  }
) {
  await assertAdmin()

  await db.update(llmUsers).set(data).where(eq(llmUsers.id, id))

  revalidatePath("/admin/llm-users")
  revalidateTag("models-list", "max")
}

export async function setDefaultLlmUser(id: string) {
  await assertAdmin()

  await db.update(llmUsers).set({ isDefault: false })
  await db.update(llmUsers).set({ isDefault: true }).where(eq(llmUsers.id, id))

  revalidatePath("/admin/llm-users")
  revalidateTag("models-list", "max")
}

export async function deleteLlmUser(id: string) {
  await assertAdmin()

  await db.delete(llmUsers).where(eq(llmUsers.id, id))

  revalidatePath("/admin/llm-users")
  revalidateTag("models-list", "max")
}

export async function setBillingCategory(
  id: string,
  category: "standard" | "pro"
) {
  await assertAdmin()

  await db
    .update(llmUsers)
    .set({ billing_category: category })
    .where(eq(llmUsers.id, id))

  revalidatePath("/admin/llm-users")
  revalidateTag("models-list", "max")
}

export async function toggleModelPicker(id: string, isInModelPicker: boolean) {
  await assertAdmin()

  await db.update(llmUsers).set({ isInModelPicker }).where(eq(llmUsers.id, id))

  revalidatePath("/admin/llm-users")
  revalidateTag("models-list", "max")
}

export async function deletePostsWithoutTitle(): Promise<{
  success: boolean
  deleted?: number
  error?: string
}> {
  await assertAdmin()

  try {
    const titlelessPosts = await db
      .select({ id: posts.id, owner: posts.owner, repo: posts.repo })
      .from(posts)
      .where(or(isNull(posts.title), eq(posts.title, "")))

    if (titlelessPosts.length === 0) {
      return { success: true, deleted: 0 }
    }

    const postIds = titlelessPosts.map((p) => p.id)

    const postComments = await db
      .select({ id: comments.id })
      .from(comments)
      .where(inArray(comments.postId, postIds))

    const commentIds = postComments.map((c) => c.id)

    if (commentIds.length > 0) {
      await db.delete(reactions).where(inArray(reactions.commentId, commentIds))
      await db.delete(comments).where(inArray(comments.id, commentIds))
    }

    await db
      .delete(mentions)
      .where(
        or(
          inArray(mentions.targetPostId, postIds),
          inArray(mentions.sourcePostId, postIds)
        )
      )

    for (const postId of postIds) {
      await deletePostFromIndex(postId)
    }

    await db.delete(posts).where(inArray(posts.id, postIds))

    const repos = new Set(titlelessPosts.map((p) => `${p.owner}:${p.repo}`))
    for (const repo of repos) {
      revalidateTag(`repo:${repo}`, "max")
    }
    for (const post of titlelessPosts) {
      revalidateTag(`post:${post.id}`, "max")
    }

    return { success: true, deleted: postIds.length }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    }
  }
}

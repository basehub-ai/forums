"use server"

import { eq, inArray } from "drizzle-orm"
import { revalidateTag } from "next/cache"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { canModerate } from "@/lib/data/permissions"
import { db } from "@/lib/db/client"
import { comments, mentions, posts, reactions } from "@/lib/db/schema"
import { deletePostFromIndex } from "@/lib/typesense-index"

export async function checkCanModerate(
  owner: string,
  repo: string
): Promise<boolean> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return false
  }
  return canModerate(session.user.id, owner, repo)
}

async function assertCanModerate(owner: string, repo: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    throw new Error("Unauthorized")
  }
  const isModerator = await canModerate(session.user.id, owner, repo)
  if (!isModerator) {
    throw new Error("Unauthorized")
  }
  return session.user
}

export async function pinPost(postId: string): Promise<void> {
  const post = await db
    .select({ owner: posts.owner, repo: posts.repo })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1)
    .then((r) => r[0])

  if (!post) {
    throw new Error("Post not found")
  }

  await assertCanModerate(post.owner, post.repo)

  await db.update(posts).set({ pinned: true }).where(eq(posts.id, postId))

  revalidateTag(`repo:${post.owner}:${post.repo}`, "max")
  revalidateTag(`post:${postId}`, "max")
}

export async function unpinPost(postId: string): Promise<void> {
  const post = await db
    .select({ owner: posts.owner, repo: posts.repo })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1)
    .then((r) => r[0])

  if (!post) {
    throw new Error("Post not found")
  }

  await assertCanModerate(post.owner, post.repo)

  await db.update(posts).set({ pinned: false }).where(eq(posts.id, postId))

  revalidateTag(`repo:${post.owner}:${post.repo}`, "max")
  revalidateTag(`post:${postId}`, "max")
}

export async function deletePost(
  postId: string
): Promise<{ owner: string; repo: string }> {
  const post = await db
    .select({ owner: posts.owner, repo: posts.repo })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1)
    .then((r) => r[0])

  if (!post) {
    throw new Error("Post not found")
  }

  await assertCanModerate(post.owner, post.repo)

  const postComments = await db
    .select({ id: comments.id })
    .from(comments)
    .where(eq(comments.postId, postId))

  const commentIds = postComments.map((c) => c.id)

  if (commentIds.length > 0) {
    await db.delete(reactions).where(inArray(reactions.commentId, commentIds))
    await db.delete(comments).where(inArray(comments.id, commentIds))
  }

  await db.delete(mentions).where(eq(mentions.targetPostId, postId))
  await db.delete(mentions).where(eq(mentions.sourcePostId, postId))

  await deletePostFromIndex(postId)
  await db.delete(posts).where(eq(posts.id, postId))

  revalidateTag(`repo:${post.owner}:${post.repo}`, "max")
  revalidateTag(`post:${postId}`, "max")

  return { owner: post.owner, repo: post.repo }
}

export async function deleteComment(commentId: string): Promise<void> {
  const comment = await db
    .select({
      id: comments.id,
      postId: comments.postId,
    })
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1)
    .then((r) => r[0])

  if (!comment) {
    throw new Error("Comment not found")
  }

  const post = await db
    .select({
      id: posts.id,
      owner: posts.owner,
      repo: posts.repo,
      rootCommentId: posts.rootCommentId,
    })
    .from(posts)
    .where(eq(posts.id, comment.postId))
    .limit(1)
    .then((r) => r[0])

  if (!post) {
    throw new Error("Post not found")
  }

  // Cannot delete the root comment (that would orphan the post)
  if (post.rootCommentId === commentId) {
    throw new Error("Cannot delete root comment")
  }

  await assertCanModerate(post.owner, post.repo)

  await db.delete(reactions).where(eq(reactions.commentId, commentId))
  await db.delete(mentions).where(eq(mentions.sourceCommentId, commentId))
  await db.delete(comments).where(eq(comments.id, commentId))

  revalidateTag(`repo:${post.owner}:${post.repo}`, "max")
  revalidateTag(`post:${post.id}`, "max")
}

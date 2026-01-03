import type { InferSelectModel } from "drizzle-orm"
import type { comments, posts } from "./db/schema"
import { typesense } from "./typesense"

type Post = InferSelectModel<typeof posts>
type Comment = InferSelectModel<typeof comments>

const POSTS_COLLECTION = "posts"
const COMMENTS_COLLECTION = "comments"

let collectionsEnsured: Promise<void> | null = null

function ensureCollectionsOnce() {
  if (!collectionsEnsured) {
    collectionsEnsured = ensureCollections().catch((err) => {
      collectionsEnsured = null
      throw err
    })
  }
  return collectionsEnsured
}

export async function ensureCollections() {
  const collections = await typesense.collections().retrieve()
  const existingNames = new Set(collections.map((c) => c.name))

  if (!existingNames.has(POSTS_COLLECTION)) {
    await typesense.collections().create({
      name: POSTS_COLLECTION,
      fields: [
        { name: "id", type: "string" },
        { name: "number", type: "int32" },
        { name: "owner", type: "string", facet: true },
        { name: "repo", type: "string", facet: true },
        { name: "title", type: "string", optional: true },
        { name: "categoryId", type: "string", optional: true, facet: true },
        { name: "authorId", type: "string", facet: true },
        { name: "commentCount", type: "int32" },
        { name: "createdAt", type: "int64" },
      ],
      default_sorting_field: "createdAt",
    })
  }

  if (!existingNames.has(COMMENTS_COLLECTION)) {
    await typesense.collections().create({
      name: COMMENTS_COLLECTION,
      fields: [
        { name: "id", type: "string" },
        { name: "postId", type: "string", facet: true },
        { name: "owner", type: "string", facet: true },
        { name: "repo", type: "string", facet: true },
        { name: "authorId", type: "string", facet: true },
        { name: "text", type: "string" },
        { name: "isRootComment", type: "bool", facet: true },
        { name: "createdAt", type: "int64" },
      ],
      default_sorting_field: "createdAt",
    })
  }
}

export async function indexPost(post: Post, commentCount: number) {
  await ensureCollectionsOnce()
  await typesense
    .collections(POSTS_COLLECTION)
    .documents()
    .upsert({
      id: post.id,
      number: post.number,
      owner: post.owner,
      repo: post.repo,
      title: post.title ?? "",
      categoryId: post.categoryId ?? "",
      authorId: post.authorId,
      commentCount,
      createdAt: post.createdAt,
    })
}

export async function updatePostIndex(
  postId: string,
  updates: {
    title?: string
    categoryId?: string
    commentCount?: number
  }
) {
  await ensureCollectionsOnce()
  const doc: Record<string, unknown> = {}
  if (updates.title !== undefined) {
    doc.title = updates.title
  }
  if (updates.categoryId !== undefined) {
    doc.categoryId = updates.categoryId
  }
  if (updates.commentCount !== undefined) {
    doc.commentCount = updates.commentCount
  }

  await typesense.collections(POSTS_COLLECTION).documents(postId).update(doc)
}

function extractText(comment: Comment): string {
  return comment.content
    .flatMap((msg) =>
      msg.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
    )
    .join("\n\n")
}

export async function indexComment(
  comment: Comment,
  owner: string,
  repo: string,
  isRootComment: boolean
) {
  const text = extractText(comment)
  if (!text.trim()) {
    return
  }

  await ensureCollectionsOnce()
  await typesense.collections(COMMENTS_COLLECTION).documents().upsert({
    id: comment.id,
    postId: comment.postId,
    owner,
    repo,
    authorId: comment.authorId,
    text,
    isRootComment,
    createdAt: comment.createdAt,
  })
}

export async function deleteCommentFromIndex(commentId: string) {
  try {
    await typesense
      .collections(COMMENTS_COLLECTION)
      .documents(commentId)
      .delete()
  } catch {
    // ignore if not found
  }
}

export async function deletePostFromIndex(postId: string) {
  try {
    await typesense.collections(POSTS_COLLECTION).documents(postId).delete()
    await typesense
      .collections(COMMENTS_COLLECTION)
      .documents()
      .delete({ filter_by: `postId:=${postId}` })
  } catch {
    // ignore if not found
  }
}

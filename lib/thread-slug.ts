import slugify from "slugify"
import type { DBThread } from "./db/threads"

export function toThreadSlug({
  title,
  id,
}: Pick<DBThread, "title" | "id">): string {
  if (!title) {
    return id
  }
  return `${slugify(title, { lower: true, strict: true, trim: true })}-${id}`
}

export function fromThreadSlug(slug: string): string {
  const parts = slug.split("-")
  return parts.at(-1) || slug
}

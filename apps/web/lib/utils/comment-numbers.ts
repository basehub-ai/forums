type Comment = {
  id: string
  threadCommentId: string | null
  createdAt: number
}

/**
 * Computes flat comment numbers from a list of comments.
 *
 * Thread metadata is intentionally ignored while threaded replies are dormant,
 * so every visible comment gets a top-level number: 1, 2, 3, 4...
 *
 * Numbers are deterministic based on createdAt order (with id as tiebreaker).
 */
export function computeCommentNumbers(
  comments: Comment[]
): Map<string, string> {
  const sorted = [...comments].sort((a, b) => {
    if (a.createdAt !== b.createdAt) {
      return a.createdAt - b.createdAt
    }
    return a.id.localeCompare(b.id)
  })

  const result = new Map<string, string>()

  for (const [index, comment] of sorted.entries()) {
    result.set(comment.id, String(index + 1))
  }

  return result
}

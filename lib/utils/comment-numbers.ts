type Comment = {
  id: string
  threadCommentId: string | null
  createdAt: number
}

/**
 * Computes hierarchical comment numbers from a flat list of comments.
 *
 * Top-level comments: 1, 2, 3, 4...
 * Replies in a thread: 3.1, 3.2, 3.3...
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
  const childCounters = new Map<string | null, number>()

  for (const comment of sorted) {
    const threadNumber = comment.threadCommentId
      ? result.get(comment.threadCommentId)
      : null

    const counter = (childCounters.get(comment.threadCommentId) ?? 0) + 1
    childCounters.set(comment.threadCommentId, counter)

    const number = threadNumber
      ? `${threadNumber}.${counter}`
      : String(counter)
    result.set(comment.id, number)
  }

  return result
}

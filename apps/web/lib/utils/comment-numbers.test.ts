import { describe, expect, test } from "bun:test"
import { computeCommentNumbers } from "./comment-numbers"

describe("computeCommentNumbers", () => {
  test("numbers comments flat, ignoring thread metadata", () => {
    const numbers = computeCommentNumbers([
      { id: "root", threadCommentId: null, createdAt: 100 },
      { id: "comment", threadCommentId: null, createdAt: 200 },
      { id: "reply", threadCommentId: "comment", createdAt: 201 },
      { id: "next", threadCommentId: null, createdAt: 300 },
    ])

    expect(numbers.get("root")).toBe("1")
    expect(numbers.get("comment")).toBe("2")
    expect(numbers.get("reply")).toBe("3")
    expect(numbers.get("next")).toBe("4")
  })
})

import { describe, expect, test } from "bun:test"
import { resolveVersionToTag, tagExists } from "../version-resolver"

// Note: These tests hit the real GitHub API.
// They may fail with 403 if rate limited (60 req/hour unauthenticated).
// Set GITHUB_TOKEN in environment for higher limits.

describe("version-resolver", () => {
  describe("resolveVersionToTag", () => {
    test("matches v-prefixed version", async () => {
      const result = await resolveVersionToTag({
        owner: "vercel",
        repo: "next.js",
        version: "16.1.0",
      })
      expect(result.tag).toBe("v16.1.0")
      expect(result.sha).toBe("34916762cdff14f27c7e3273d74af60eb6c23cb6")
    })
  })

  describe("tagExists", () => {
    test("returns true when tag exists", async () => {
      const exists = await tagExists({
        owner: "vercel",
        repo: "next.js",
        tag: "v16.1.0",
      })
      expect(exists).toBe(true)
    })

    test("returns false when tag does not exist", async () => {
      const exists = await tagExists({
        owner: "vercel",
        repo: "next.js",
        tag: "v99.99.99",
      })
      expect(exists).toBe(false)
    })
  })
})

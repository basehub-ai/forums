import { describe, expect, mock, test } from "bun:test"
import { resolveVersionToTag, tagExists } from "../version-resolver"

// Mock githubFetch
const mockGithubFetch = mock(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve([
        { name: "v14.0.0", commit: { sha: "abc123" } },
        { name: "v13.0.0", commit: { sha: "def456" } },
        { name: "14.0.0", commit: { sha: "ghi789" } },
        { name: "next@14.0.0", commit: { sha: "jkl012" } },
      ]),
  })
)

mock.module("@/lib/data/github", () => ({
  githubFetch: mockGithubFetch,
}))

describe("version-resolver", () => {
  describe("resolveVersionToTag", () => {
    test("matches v-prefixed version first", async () => {
      const result = await resolveVersionToTag("vercel", "next.js", "14.0.0")
      expect(result.tag).toBe("v14.0.0")
      expect(result.sha).toBe("abc123")
    })

    test("matches bare version when v-prefix not found", async () => {
      // Mock returns tags where v15.0.0 doesn't exist
      mockGithubFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([{ name: "15.0.0", commit: { sha: "xyz999" } }]),
        })
      )

      const result = await resolveVersionToTag("vercel", "next.js", "15.0.0")
      expect(result.tag).toBe("15.0.0")
      expect(result.sha).toBe("xyz999")
    })

    test("matches monorepo tag pattern with package name", async () => {
      mockGithubFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              { name: "next@14.0.0", commit: { sha: "mono123" } },
            ]),
        })
      )

      const result = await resolveVersionToTag(
        "vercel",
        "next.js",
        "14.0.0",
        "next"
      )
      expect(result.tag).toBe("next@14.0.0")
      expect(result.sha).toBe("mono123")
    })

    test("throws TagNotFoundError when no pattern matches", async () => {
      mockGithubFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([{ name: "v1.0.0", commit: { sha: "old" } }]),
        })
      )

      await expect(
        resolveVersionToTag("vercel", "next.js", "99.0.0")
      ).rejects.toThrow("No matching git tag found")
    })
  })

  describe("tagExists", () => {
    test("returns true when tag exists", async () => {
      mockGithubFetch.mockImplementationOnce(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
      )
      const exists = await tagExists("vercel", "next.js", "v14.0.0")
      expect(exists).toBe(true)
    })

    test("returns false when tag does not exist", async () => {
      mockGithubFetch.mockImplementationOnce(() =>
        Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve([]) })
      )
      const exists = await tagExists("vercel", "next.js", "v99.0.0")
      expect(exists).toBe(false)
    })
  })
})

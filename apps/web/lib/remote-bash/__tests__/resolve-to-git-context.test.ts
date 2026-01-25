import { describe, expect, test } from "bun:test"
import { resolveToGitContext } from "../index"

describe("resolveToGitContext", () => {
  describe("GitHub repos", () => {
    test("resolves owner/repo format", async () => {
      const result = await resolveToGitContext({
        repo: "vercel/next.js",
      })

      expect(result.gitContext.owner).toBe("vercel")
      expect(result.gitContext.repo).toBe("next.js")
      expect(result.gitContext.ref).toBeUndefined()
      expect(result.packageName).toBeUndefined()
    })

    test("resolves GitHub URL", async () => {
      const result = await resolveToGitContext({
        repo: "https://github.com/vercel/next.js",
      })

      expect(result.gitContext.owner).toBe("vercel")
      expect(result.gitContext.repo).toBe("next.js")
    })

    test("preserves explicit ref", async () => {
      const result = await resolveToGitContext({
        repo: "vercel/next.js",
        ref: "canary",
      })

      expect(result.gitContext.ref).toBe("canary")
    })
  })

  describe("npm packages", () => {
    test("resolves npm package to GitHub repo with gitHead", async () => {
      const result = await resolveToGitContext({
        repo: "next",
        version: "16.1.0",
      })

      expect(result.gitContext.owner).toBe("vercel")
      expect(result.gitContext.repo).toBe("next.js")
      // Uses gitHead from npm registry (no GitHub API call needed)
      expect(result.gitContext.ref).toBe(
        "34916762cdff14f27c7e3273d74af60eb6c23cb6"
      )
      expect(result.resolvedVersion).toBe("16.1.0")
      expect(result.packageName).toBe("next")
    })

    test("explicit ref overrides gitHead", async () => {
      const result = await resolveToGitContext({
        repo: "next",
        version: "16.1.0",
        ref: "canary",
      })

      expect(result.gitContext.ref).toBe("canary")
    })
  })

  describe("error cases", () => {
    test("throws for non-existent npm package", async () => {
      await expect(
        resolveToGitContext({
          repo: "this-package-definitely-does-not-exist-12345",
        })
      ).rejects.toThrow()
    })
  })
})

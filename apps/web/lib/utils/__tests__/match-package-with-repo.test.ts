import { describe, expect, test } from "bun:test"
import { resolveNpmPackage } from "../match-package-with-repo"

describe("resolveNpmPackage", () => {
  test("resolves package with specific version", async () => {
    const result = await resolveNpmPackage({
      packageName: "next",
      version: "16.1.0",
    })

    expect(result.registry).toBe("npm")
    expect(result.name).toBe("next")
    expect(result.version).toBe("16.1.0")
    expect(result.repoUrl).toBe("https://github.com/vercel/next.js")
    expect(result.gitHead).toBe("34916762cdff14f27c7e3273d74af60eb6c23cb6")
    expect(result.gitTag).toBe("v16.1.0")
  })

  test("resolves package without version (uses latest)", async () => {
    const result = await resolveNpmPackage({
      packageName: "next",
    })

    expect(result.registry).toBe("npm")
    expect(result.name).toBe("next")
    expect(result.version).toMatch(/^\d+\.\d+\.\d+/)
    expect(result.repoUrl).toBe("https://github.com/vercel/next.js")
  })

  test("resolves scoped package", async () => {
    const result = await resolveNpmPackage({
      packageName: "@vercel/analytics",
      version: "1.0.0",
    })

    expect(result.registry).toBe("npm")
    expect(result.name).toBe("@vercel/analytics")
    expect(result.version).toBe("1.0.0")
    expect(result.repoUrl).toContain("github.com")
  })

  test("throws for non-existent package", async () => {
    await expect(
      resolveNpmPackage({
        packageName: "this-package-definitely-does-not-exist-12345",
      })
    ).rejects.toThrow("not found on npm")
  })

  test("throws for non-existent version", async () => {
    await expect(
      resolveNpmPackage({
        packageName: "next",
        version: "99.99.99",
      })
    ).rejects.toThrow('Version "99.99.99" not found')
  })
})

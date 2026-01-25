import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { mkdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { detectInstalledVersion } from "./detect-version"

describe("detectInstalledVersion", () => {
  let testDir: string

  beforeEach(async () => {
    testDir = join(tmpdir(), `detect-version-test-${Date.now()}`)
    await mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true })
  })

  it("detects version from node_modules", async () => {
    const pkgDir = join(testDir, "node_modules", "zod")
    await mkdir(pkgDir, { recursive: true })
    await writeFile(
      join(pkgDir, "package.json"),
      JSON.stringify({ name: "zod", version: "3.22.4" })
    )

    const version = await detectInstalledVersion({
      packageName: "zod",
      cwd: testDir,
    })
    expect(version).toBe("3.22.4")
  })

  it("detects version from package-lock.json (npm v7+)", async () => {
    await writeFile(
      join(testDir, "package-lock.json"),
      JSON.stringify({
        packages: {
          "node_modules/zod": { version: "3.21.0" },
        },
      })
    )

    const version = await detectInstalledVersion({
      packageName: "zod",
      cwd: testDir,
    })
    expect(version).toBe("3.21.0")
  })

  it("detects version from package-lock.json (npm v6)", async () => {
    await writeFile(
      join(testDir, "package-lock.json"),
      JSON.stringify({
        dependencies: {
          zod: { version: "3.20.0" },
        },
      })
    )

    const version = await detectInstalledVersion({
      packageName: "zod",
      cwd: testDir,
    })
    expect(version).toBe("3.20.0")
  })

  it("detects version from bun.lock", async () => {
    await writeFile(
      join(testDir, "bun.lock"),
      `{
  "packages": {
    "zod": ["zod@3.23.8", ""]
  }
}`
    )

    const version = await detectInstalledVersion({
      packageName: "zod",
      cwd: testDir,
    })
    expect(version).toBe("3.23.8")
  })

  it("detects version from pnpm-lock.yaml", async () => {
    await writeFile(
      join(testDir, "pnpm-lock.yaml"),
      `packages:
  'zod@3.22.0':
    resolution: {integrity: sha512-xyz}
`
    )

    const version = await detectInstalledVersion({
      packageName: "zod",
      cwd: testDir,
    })
    expect(version).toBe("3.22.0")
  })

  it("detects version from yarn.lock", async () => {
    await writeFile(
      join(testDir, "yarn.lock"),
      `"zod@^3.0.0":
  version "3.19.0"
  resolved "https://registry.yarnpkg.com/zod/-/zod-3.19.0.tgz"
`
    )

    const version = await detectInstalledVersion({
      packageName: "zod",
      cwd: testDir,
    })
    expect(version).toBe("3.19.0")
  })

  it("falls back to package.json", async () => {
    await writeFile(
      join(testDir, "package.json"),
      JSON.stringify({
        dependencies: { zod: "^3.18.0" },
      })
    )

    const version = await detectInstalledVersion({
      packageName: "zod",
      cwd: testDir,
    })
    expect(version).toBe("3.18.0")
  })

  it("strips version prefixes from package.json", async () => {
    await writeFile(
      join(testDir, "package.json"),
      JSON.stringify({
        devDependencies: { typescript: "~5.0.0" },
      })
    )

    const version = await detectInstalledVersion({
      packageName: "typescript",
      cwd: testDir,
    })
    expect(version).toBe("5.0.0")
  })

  it("returns null when package not found", async () => {
    await writeFile(
      join(testDir, "package.json"),
      JSON.stringify({ dependencies: {} })
    )

    const version = await detectInstalledVersion({
      packageName: "nonexistent",
      cwd: testDir,
    })
    expect(version).toBeNull()
  })

  it("handles scoped packages", async () => {
    const pkgDir = join(testDir, "node_modules", "@types", "node")
    await mkdir(pkgDir, { recursive: true })
    await writeFile(
      join(pkgDir, "package.json"),
      JSON.stringify({ name: "@types/node", version: "20.10.0" })
    )

    const version = await detectInstalledVersion({
      packageName: "@types/node",
      cwd: testDir,
    })
    expect(version).toBe("20.10.0")
  })
})

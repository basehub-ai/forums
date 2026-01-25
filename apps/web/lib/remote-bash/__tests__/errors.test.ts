import { describe, expect, test } from "bun:test"
import {
  CommandTimeoutError,
  RateLimitError,
  RemoteBashError,
  RepoNotFoundError,
  SandboxError,
  TagNotFoundError,
  VersionNotFoundError,
} from "../errors"

describe("remote-bash errors", () => {
  test("RemoteBashError has correct properties", () => {
    const error = new RemoteBashError("test message", "TEST_CODE", 418)
    expect(error.message).toBe("test message")
    expect(error.code).toBe("TEST_CODE")
    expect(error.statusCode).toBe(418)
    expect(error.name).toBe("RemoteBashError")
    expect(error instanceof Error).toBe(true)
  })

  test("RemoteBashError defaults to 400 status", () => {
    const error = new RemoteBashError("test", "CODE")
    expect(error.statusCode).toBe(400)
  })

  test("RepoNotFoundError has 404 status", () => {
    const error = new RepoNotFoundError("owner/repo")
    expect(error.statusCode).toBe(404)
    expect(error.code).toBe("REPO_NOT_FOUND")
    expect(error.message).toContain("owner/repo")
  })

  test("VersionNotFoundError has 404 status", () => {
    const error = new VersionNotFoundError("99.0.0", "next")
    expect(error.statusCode).toBe(404)
    expect(error.code).toBe("VERSION_NOT_FOUND")
    expect(error.message).toContain("99.0.0")
    expect(error.message).toContain("next")
  })

  test("TagNotFoundError has 404 status", () => {
    const error = new TagNotFoundError("1.0.0", "vercel/next.js")
    expect(error.statusCode).toBe(404)
    expect(error.code).toBe("TAG_NOT_FOUND")
  })

  test("CommandTimeoutError has 408 status", () => {
    const error = new CommandTimeoutError(30_000)
    expect(error.statusCode).toBe(408)
    expect(error.code).toBe("TIMEOUT")
    expect(error.message).toContain("30000")
  })

  test("RateLimitError has 429 status and retryAfter", () => {
    const error = new RateLimitError(60_000)
    expect(error.statusCode).toBe(429)
    expect(error.code).toBe("RATE_LIMITED")
    expect(error.retryAfter).toBe(60_000)
  })

  test("SandboxError has 500 status", () => {
    const error = new SandboxError("failed to create")
    expect(error.statusCode).toBe(500)
    expect(error.code).toBe("SANDBOX_ERROR")
    expect(error.message).toContain("failed to create")
  })
})

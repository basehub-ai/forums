export class RemoteBashError extends Error {
  code: string
  statusCode: number

  constructor(message: string, code: string, statusCode = 400) {
    super(message)
    this.name = "RemoteBashError"
    this.code = code
    this.statusCode = statusCode
  }
}

export class RepoNotFoundError extends RemoteBashError {
  constructor(repo: string) {
    super(
      `Repository '${repo}' not found or inaccessible`,
      "REPO_NOT_FOUND",
      404
    )
  }
}

export class VersionNotFoundError extends RemoteBashError {
  constructor(version: string, packageName: string) {
    super(
      `Version '${version}' not found for '${packageName}'`,
      "VERSION_NOT_FOUND",
      404
    )
  }
}

export class TagNotFoundError extends RemoteBashError {
  constructor(version: string, repo: string) {
    super(
      `No matching git tag found for version '${version}' in '${repo}'`,
      "TAG_NOT_FOUND",
      404
    )
  }
}

export class CommandTimeoutError extends RemoteBashError {
  constructor(timeoutMs: number) {
    super(`Command timed out after ${timeoutMs}ms`, "TIMEOUT", 408)
  }
}

export class OutputTruncatedError extends RemoteBashError {
  constructor(limit: number, type: "stdout" | "stderr") {
    super(
      `${type} exceeded ${limit} bytes and was truncated`,
      "OUTPUT_TRUNCATED",
      200
    )
  }
}

export class RateLimitError extends RemoteBashError {
  retryAfter: number

  constructor(retryAfterMs: number) {
    super("Rate limit exceeded", "RATE_LIMITED", 429)
    this.retryAfter = retryAfterMs
  }
}

export class SandboxError extends RemoteBashError {
  constructor(message: string) {
    super(`Sandbox error: ${message}`, "SANDBOX_ERROR", 500)
  }
}

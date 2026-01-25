import { type GitContext, getWorkspace } from "@/agent/workspace"
import { parseGitHubInput } from "@/lib/resolve-repo-input"
import { resolveNpmPackage } from "@/lib/utils/match-package-with-repo"
import { DEFAULT_TIMEOUT, executeCommand, MAX_TIMEOUT } from "./command"
import { RemoteBashError, RepoNotFoundError } from "./errors"
import { resolveVersionToTag } from "./version-resolver"

export type RemoteBashRequest = {
  repo: string // GitHub URL, owner/repo, or npm package
  command: string // Bash command to execute
  ref?: string // Git ref (branch, tag, commit SHA)
  version?: string // Package version - triggers tag resolution
  timeout?: number // ms (default: 30000, max: 120000)
}

export type RemoteBashResponse = {
  success: boolean
  stdout: string
  stderr: string
  exitCode: number
  resolvedRef: string // Actual git SHA used
  resolvedVersion?: string // If version provided
  executionTimeMs: number
  truncated: boolean
}

/**
 * Resolve repo input with optional version to a GitContext.
 * Handles npm packages with version → tag resolution.
 */
export async function resolveToGitContext({
  repo,
  ref,
  version,
}: {
  repo: string
  ref?: string
  version?: string
}): Promise<{
  gitContext: GitContext
  resolvedVersion?: string
  packageName?: string
}> {
  // If it's already a GitHub URL or owner/repo, use it directly
  const githubParsed = parseGitHubInput(repo)
  if (githubParsed) {
    let effectiveRef = ref

    // If version provided for GitHub repo, resolve to tag
    if (version && !ref) {
      const resolved = await resolveVersionToTag({
        owner: githubParsed.owner,
        repo: githubParsed.repo,
        version,
      })
      effectiveRef = resolved.tag
    }

    return {
      gitContext: {
        owner: githubParsed.owner,
        repo: githubParsed.repo,
        ref: effectiveRef,
      },
      resolvedVersion: version,
    }
  }

  // Must be an npm package name
  try {
    const npmResolved = await resolveNpmPackage({ packageName: repo, version })
    const repoUrl = parseGitHubInput(npmResolved.repoUrl)

    if (!repoUrl) {
      throw new RemoteBashError(
        `NPM package '${repo}' repository is not on GitHub: ${npmResolved.repoUrl}`,
        "INVALID_REPO",
        400
      )
    }

    // Prefer explicit ref, then gitHead (exact SHA), then resolve tag, then fallback gitTag
    let effectiveRef = ref
    if (!effectiveRef) {
      if (npmResolved.gitHead) {
        // Best option: exact commit SHA from npm publish
        effectiveRef = npmResolved.gitHead
      } else {
        // No gitHead, try to resolve tag pattern
        try {
          const tagResolved = await resolveVersionToTag({
            owner: repoUrl.owner,
            repo: repoUrl.repo,
            version: npmResolved.version,
            packageName: repo,
          })
          effectiveRef = tagResolved.tag
        } catch {
          console.warn(
            `No gitHead and tag resolution failed for ${repo}@${npmResolved.version}, falling back to ${npmResolved.gitTag}`
          )
          effectiveRef = npmResolved.gitTag
        }
      }
    }

    return {
      gitContext: {
        owner: repoUrl.owner,
        repo: repoUrl.repo,
        ref: effectiveRef,
      },
      resolvedVersion: npmResolved.version,
      packageName: repo,
    }
  } catch (err) {
    if (err instanceof RemoteBashError) {
      throw err
    }
    throw new RepoNotFoundError(repo)
  }
}

/**
 * Execute a bash command against a public GitHub repository.
 */
export async function remoteBash(
  request: RemoteBashRequest
): Promise<RemoteBashResponse> {
  const { repo, command, ref, version, timeout = DEFAULT_TIMEOUT } = request

  if (!repo?.trim()) {
    throw new RemoteBashError("Repository is required", "MISSING_REPO", 400)
  }

  if (!command?.trim()) {
    throw new RemoteBashError("Command is required", "MISSING_COMMAND", 400)
  }

  const effectiveTimeout = Math.min(Math.max(timeout, 1000), MAX_TIMEOUT)

  // Resolve repo to git context
  const { gitContext, resolvedVersion } = await resolveToGitContext({
    repo,
    ref,
    version,
  })

  // Get workspace (reuses existing sandbox if available)
  const workspace = await getWorkspace({
    sandboxId: null,
    gitContext,
    mode: "ask",
  })

  // Execute command
  const result = await executeCommand(
    workspace.sandbox,
    workspace.path,
    command,
    effectiveTimeout
  )

  return {
    success: result.exitCode === 0,
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    resolvedRef: workspace.gitContextData.sha,
    resolvedVersion,
    executionTimeMs: result.executionTimeMs,
    truncated: result.truncated,
  }
}

// Re-export types and utilities
// biome-ignore lint/performance/noBarrelFile: .
export { DEFAULT_TIMEOUT, MAX_TIMEOUT } from "./command"
export { RateLimitError, RemoteBashError } from "./errors"

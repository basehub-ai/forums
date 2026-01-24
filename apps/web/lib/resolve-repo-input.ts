/** biome-ignore-all lint/performance/useTopLevelRegex: we are good here */
import { githubFetch } from "@/lib/data/github"
import { resolveNpmPackage } from "@/lib/utils/match-package-with-repo"

export type ResolvedRepoInput = {
  owner: string
  repo: string
  defaultRef?: string
}

/**
 * Parse a GitHub URL or owner/repo format to extract owner and repo.
 * Returns null if the input doesn't match these formats.
 */
export function parseGitHubInput(
  input: string
): { owner: string; repo: string } | null {
  const trimmed = input.trim()
  if (!trimmed) {
    return null
  }

  // Try parsing as GitHub URL
  // Matches: https://github.com/owner/repo, github.com/owner/repo, etc.
  const githubUrlMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/]+)/i
  )
  if (githubUrlMatch) {
    const [, owner, repo] = githubUrlMatch
    // Remove any trailing .git or other extensions
    const cleanRepo = repo.replace(/\.git$/, "").split(/[?#]/)[0]
    return { owner, repo: cleanRepo }
  }

  // Try parsing as owner/repo format (with or without leading slash)
  const pathMatch = trimmed.match(/^\/?([^/]+)\/([^/]+)\/?$/)
  if (pathMatch) {
    const [, owner, repo] = pathMatch
    return { owner, repo }
  }

  return null
}

/**
 * Validate that a GitHub repository exists and is publicly accessible.
 */
async function validateGitHubRepo(owner: string, repo: string): Promise<void> {
  const res = await githubFetch(`https://api.github.com/repos/${owner}/${repo}`)

  if (res.status === 404) {
    throw new Error(`GitHub repository '${owner}/${repo}' does not exist.`)
  }

  if (res.status === 403) {
    throw new Error(
      `GitHub repository '${owner}/${repo}' is private or inaccessible.`
    )
  }

  if (!res.ok) {
    throw new Error(
      `Failed to verify GitHub repository '${owner}/${repo}': ${res.status} ${res.statusText}`
    )
  }
}

/**
 * Parse an NPM package name with optional version.
 * Supports: "next", "next@14.0.0", "@scope/package", "@scope/package@1.0.0"
 */
function parseNpmPackageInput(input: string): {
  packageName: string
  version?: string
} | null {
  const trimmed = input.trim()
  if (!trimmed) {
    return null
  }

  // Match package names (with optional @scope) and optional @version
  // Examples: next, next@14.0.0, @vercel/next, @vercel/next@1.0.0
  const match = trimmed.match(/^(@?[^@]+)(?:@([^@]+))?$/)
  if (!match) {
    return null
  }

  const [, packageName, version] = match
  return { packageName, version }
}

/**
 * Resolve a repository input to owner/repo.
 *
 * Accepts:
 * - GitHub URL: https://github.com/vercel/next.js
 * - Owner/repo: vercel/next.js
 * - NPM package: next (resolves via npm registry)
 * - NPM package with version: next@14.0.0
 *
 * @throws Error with descriptive message if input cannot be resolved
 */
export async function resolveRepoInput(
  input: string
): Promise<ResolvedRepoInput> {
  const trimmed = input.trim()
  if (!trimmed) {
    throw new Error(
      "Invalid repository. Use GitHub URL (https://github.com/owner/repo), owner/repo format, or npm package name."
    )
  }

  // Try GitHub URL or owner/repo format first
  const githubParsed = parseGitHubInput(trimmed)
  if (githubParsed) {
    await validateGitHubRepo(githubParsed.owner, githubParsed.repo)
    return githubParsed
  }

  // Try NPM package
  const npmParsed = parseNpmPackageInput(trimmed)
  if (!npmParsed) {
    throw new Error(
      "Invalid repository. Use GitHub URL (https://github.com/owner/repo), owner/repo format, or npm package name."
    )
  }

  try {
    const resolved = await resolveNpmPackage(
      npmParsed.packageName,
      npmParsed.version
    )

    // Parse the GitHub URL from the npm package
    const githubUrl = parseGitHubInput(resolved.repoUrl)
    if (!githubUrl) {
      throw new Error(
        `NPM package '${npmParsed.packageName}' repository URL is not a GitHub repository: ${resolved.repoUrl}`
      )
    }

    await validateGitHubRepo(githubUrl.owner, githubUrl.repo)

    return {
      owner: githubUrl.owner,
      repo: githubUrl.repo,
      defaultRef: resolved.gitTag,
    }
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes("not found on npm")) {
        throw new Error(
          `NPM package '${npmParsed.packageName}' not found or has no GitHub repository.`
        )
      }
      if (err.message.includes("Version")) {
        throw err
      }
      if (err.message.includes("No repository URL")) {
        throw new Error(
          `NPM package '${npmParsed.packageName}' not found or has no GitHub repository.`
        )
      }
    }
    throw new Error(
      `Failed to resolve NPM package '${npmParsed.packageName}': ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

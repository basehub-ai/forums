import { githubFetch } from "@/lib/github-fetch"
import { TagNotFoundError } from "./errors"

type GitHubTag = {
  name: string
  commit: { sha: string }
}

/**
 * Generate tag patterns to try for a given version and package name.
 * Tries common patterns in order of likelihood.
 */
function getTagPatterns(version: string, packageName?: string): string[] {
  const patterns = [
    `v${version}`, // v14.0.0 (most common)
    version, // 14.0.0
    `release-${version}`, // release-14.0.0
  ]

  // For scoped packages, also try monorepo patterns
  if (packageName) {
    const baseName = packageName.startsWith("@")
      ? packageName.split("/")[1]
      : packageName
    patterns.push(`${baseName}@${version}`) // next@14.0.0
    patterns.push(`${packageName}@${version}`) // @vercel/next@14.0.0
  }

  return patterns
}

/**
 * Fetch all tags from a GitHub repository.
 * Uses pagination to get all tags if there are many.
 */
async function fetchGitHubTags(
  owner: string,
  repo: string
): Promise<GitHubTag[]> {
  const tags: GitHubTag[] = []
  let page = 1
  const perPage = 100

  while (true) {
    const res = await githubFetch(
      `https://api.github.com/repos/${owner}/${repo}/tags?per_page=${perPage}&page=${page}`
    )

    if (!res.ok) {
      throw new Error(`Failed to fetch tags: ${res.status}`)
    }

    const pageTags = (await res.json()) as GitHubTag[]
    tags.push(...pageTags)

    // Stop if we got fewer than perPage (no more pages)
    // or if we've fetched enough tags (limit to 500 for performance)
    if (pageTags.length < perPage || tags.length >= 500) {
      break
    }
    page++
  }

  return tags
}

/**
 * Resolve a version string to a git tag.
 * Tries multiple tag patterns and returns the first match.
 */
export async function resolveVersionToTag({
  owner,
  repo,
  version,
  packageName,
}: {
  owner: string
  repo: string
  version: string
  packageName?: string
}): Promise<{ tag: string; sha: string }> {
  const tags = await fetchGitHubTags(owner, repo)
  const tagMap = new Map(tags.map((t) => [t.name, t.commit.sha]))

  const patterns = getTagPatterns(version, packageName)

  for (const pattern of patterns) {
    const sha = tagMap.get(pattern)
    if (sha) {
      return { tag: pattern, sha }
    }
  }

  throw new TagNotFoundError(version, `${owner}/${repo}`)
}

/**
 * Check if a specific tag exists in the repository.
 */
export async function tagExists({
  owner,
  repo,
  tag,
}: {
  owner: string
  repo: string
  tag: string
}): Promise<boolean> {
  const res = await githubFetch(
    `https://api.github.com/repos/${owner}/${repo}/git/refs/tags/${encodeURIComponent(tag)}`
  )
  return res.ok
}

/** biome-ignore-all lint/performance/useTopLevelRegex: we are good here */

const NPM_REGISTRY = "https://registry.npmjs.org"

/**
 * Fetch package metadata from npm registry
 */
export async function fetchNpmPackageInfo(packageName: string) {
  const url = `${NPM_REGISTRY}/${encodeURIComponent(packageName).replace("%40", "@")}`

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Package "${packageName}" not found on npm`)
    }
    throw new Error(
      `Failed to fetch package info: ${response.status} ${response.statusText}`
    )
  }

  return response.json()
}

/**
 * Extract repository URL from npm package metadata
 */
export function extractRepoUrl(
  // biome-ignore lint/suspicious/noExplicitAny: npm package info
  info: any,
  version?: string
): { url: string; directory?: string } | null {
  // Try to get repo info from specific version first, then fall back to top-level
  const versionInfo = version ? info.versions[version] : null
  const repo = versionInfo?.repository || info.repository

  if (!repo?.url) {
    return null
  }

  let url = repo.url

  // Normalize git URLs
  // git+https://github.com/user/repo.git -> https://github.com/user/repo
  // git://github.com/user/repo.git -> https://github.com/user/repo
  // git+ssh://git@github.com/user/repo.git -> https://github.com/user/repo
  url = url
    .replace(/^git\+/, "")
    .replace(/^git:\/\//, "https://")
    .replace(/^git\+ssh:\/\/git@/, "https://")
    .replace(/^ssh:\/\/git@/, "https://")
    .replace(/\.git$/, "")

  // Handle GitHub shorthand
  if (url.startsWith("github:")) {
    url = `https://github.com/${url.slice(7)}`
  }

  return {
    url,
    directory: repo.directory,
  }
}

/**
 * Get the latest version from registry response
 */
export function getLatestVersion(
  // biome-ignore lint/suspicious/noExplicitAny: npm package info
  info: any
): string {
  return info["dist-tags"].latest
}

/**
 * Resolve an npm package to its repository information
 */
export async function resolveNpmPackage(packageName: string, version?: string) {
  // biome-ignore lint/suspicious/noExplicitAny: npm package info
  const info = (await fetchNpmPackageInfo(packageName)) as any

  if (!info) {
    throw new Error(`Failed to fetch package info for "${packageName}"`)
  }

  // If no version specified, use latest
  const resolvedVersion = version || getLatestVersion(info)

  // Verify the version exists
  if (!info.versions[resolvedVersion]) {
    const availableVersions = Object.keys(info.versions).slice(-5).join(", ")
    throw new Error(
      `Version "${resolvedVersion}" not found for "${packageName}". ` +
        `Recent versions: ${availableVersions}`
    )
  }

  const repo = extractRepoUrl(info, resolvedVersion)

  if (!repo) {
    throw new Error(
      `No repository URL found for "${packageName}@${resolvedVersion}". ` +
        "This package may not have its source published."
    )
  }

  // Get gitHead (exact commit SHA) from version metadata - most reliable
  const versionInfo = info.versions[resolvedVersion]
  const gitHead: string | undefined = versionInfo?.gitHead

  // Fallback git tag pattern if no gitHead
  const gitTag = `v${resolvedVersion}`

  return {
    registry: "npm",
    name: packageName,
    version: resolvedVersion,
    repoUrl: repo.url,
    repoDirectory: repo.directory,
    gitHead,
    gitTag,
  }
}

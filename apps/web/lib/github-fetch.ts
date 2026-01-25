/**
 * Fetch from GitHub API with automatic auth and retry logic.
 * No db dependencies - safe to use in tests.
 */
export async function githubFetch(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers)
  headers.set("Accept", "application/vnd.github.v3+json")

  // Use caller-provided auth, or fall back to server token
  if (!headers.has("Authorization") && process.env.GITHUB_TOKEN) {
    headers.set("Authorization", `Bearer ${process.env.GITHUB_TOKEN}`)
  }

  const maxRetries = 3
  let lastError: unknown

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, { ...init, headers })

      // Fine-grained PATs return 403 for repos they don't have access to.
      // Retry without token for public repos.
      if (res.status === 403 && headers.has("Authorization")) {
        headers.delete("Authorization")
        console.warn(
          "Retrying GitHub request without token due to 403 response.",
          url
        )
        return fetch(url, { ...init, headers })
      }

      return res
    } catch (error) {
      // Prerender rejections will keep failing - don't retry
      if (error instanceof Error && error.message.includes("prerendering")) {
        throw error
      }
      lastError = error
      if (attempt < maxRetries - 1) {
        const delay = 2 ** attempt * 1000
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}

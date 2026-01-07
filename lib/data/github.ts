import { cache } from "react"
import { z } from "zod"

export async function githubFetch(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers)
  headers.set("Accept", "application/vnd.github.v3+json")

  if (process.env.GITHUB_TOKEN) {
    headers.set("Authorization", `Bearer ${process.env.GITHUB_TOKEN}`)
  }

  const res = await fetch(url, { ...init, headers })

  // Fine-grained PATs return 403 for repos they don't have access to.
  // Retry without token for public repos.
  if (res.status === 403 && process.env.GITHUB_TOKEN) {
    headers.delete("Authorization")
    console.warn(
      "Retrying GitHub request without token due to 403 response.",
      url
    )
    return fetch(url, { ...init, headers })
  }

  return res
}

const githubRepoSchema = z.object({
  description: z.string().nullable(),
  stargazers_count: z.number(),
  homepage: z.string().nullable(),
})

export type GithubRepoData = z.infer<typeof githubRepoSchema>

export const getGithubRepo = cache(
  async (owner: string, repo: string): Promise<GithubRepoData | null> => {
    const res = await githubFetch(
      `https://api.github.com/repos/${owner}/${repo}`
    )

    if (!res.ok || res.status === 404) {
      return null
    }

    return githubRepoSchema.parse(await res.json())
  }
)

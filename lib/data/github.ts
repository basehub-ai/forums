import { cache } from "react"
import { z } from "zod"

const githubRepoSchema = z.object({
  description: z.string().nullable(),
  stargazers_count: z.number(),
  homepage: z.string().nullable(),
})

export type GithubRepoData = z.infer<typeof githubRepoSchema>

export const getGithubRepo = cache(
  async (owner: string, repo: string): Promise<GithubRepoData | null> => {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        ...(process.env.GITHUB_TOKEN && {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        }),
      },
    })

    if (!res.ok || res.status === 404) {
      return null
    }

    return githubRepoSchema.parse(await res.json())
  }
)

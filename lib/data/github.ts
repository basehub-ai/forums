import { eq } from "drizzle-orm"
import { cache } from "react"
import { z } from "zod"
import { db } from "@/lib/db/client"
import { account } from "@/lib/db/schema"

export async function getUserAccessToken(
  userId: string
): Promise<string | null> {
  const githubAccount = await db
    .select({ accessToken: account.accessToken })
    .from(account)
    .where(eq(account.userId, userId))
    .limit(1)
    .then((r) => r[0])

  return githubAccount?.accessToken ?? null
}

export async function githubFetch(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers)
  headers.set("Accept", "application/vnd.github.v3+json")

  if (process.env.GITHUB_TOKEN) {
    headers.set("Authorization", `Bearer ${process.env.GITHUB_TOKEN}`)
  }

  const maxRetries = 3
  let lastError: unknown

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
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

const githubRepoSchema = z.object({
  description: z.string().nullable(),
  stargazers_count: z.number(),
  homepage: z.string().nullable(),
  default_branch: z.string(),
})

export type GithubRepoData = z.infer<typeof githubRepoSchema>

export const getGithubRepo = cache(
  async (owner: string, repo: string): Promise<GithubRepoData | null> => {
    try {
      const res = await githubFetch(
        `https://api.github.com/repos/${owner}/${repo}`
      )

      if (!res.ok || res.status === 404) {
        return null
      }

      return githubRepoSchema.parse(await res.json())
    } catch (error) {
      console.error(`Failed to fetch GitHub repo ${owner}/${repo}:`, error)
      return null
    }
  }
)

const githubBranchSchema = z.object({
  name: z.string(),
})

export const getBranches = cache(
  async (owner: string, repo: string): Promise<string[] | null> => {
    try {
      const res = await githubFetch(
        `https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`
      )

      if (!res.ok || res.status === 404) {
        return null
      }

      const branches = z.array(githubBranchSchema).parse(await res.json())
      return branches.map((b) => b.name)
    } catch (error) {
      console.error(`Failed to fetch branches for ${owner}/${repo}:`, error)
      return null
    }
  }
)

const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql"

const searchBranchesQuery = `
  query($owner: String!, $repoName: String!, $queryString: String!, $first: Int!) {
    repository(owner: $owner, name: $repoName) {
      refs(first: $first, query: $queryString, refPrefix: "refs/heads/") {
        nodes {
          name
        }
      }
    }
  }
`

export async function searchBranches(
  owner: string,
  repo: string,
  query: string,
  first: number,
  accessToken: string
): Promise<string[]> {
  const res = await fetch(GITHUB_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    body: JSON.stringify({
      query: searchBranchesQuery,
      variables: {
        owner,
        repoName: repo,
        queryString: query,
        first,
      },
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GitHub GraphQL request failed (${res.status}): ${text}`)
  }

  const json = (await res.json()) as {
    errors?: { message: string }[]
    data?: {
      repository?: {
        refs?: {
          nodes?: { name: string }[]
        }
      }
    }
  }

  if (json.errors?.length) {
    throw new Error(
      `GitHub GraphQL error: ${json.errors.map((e) => e.message).join(", ")}`
    )
  }

  return json.data?.repository?.refs?.nodes?.map((n) => n.name) ?? []
}

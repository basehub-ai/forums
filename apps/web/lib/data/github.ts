import { eq } from "drizzle-orm"
import { cache } from "react"
import { z } from "zod"
import { db } from "@/lib/db/client"
import { account } from "@/lib/db/schema"
import { githubFetch } from "@/lib/github-fetch"

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

const githubRepoSchema = z.object({
  description: z.string().nullable(),
  stargazers_count: z.number(),
  homepage: z.string().nullable(),
  default_branch: z.string(),
  private: z.boolean(),
})

export type GithubRepoData = z.infer<typeof githubRepoSchema>

export const getGithubRepo = cache(
  async (args: {
    owner: string
    repo: string
    userAccessToken?: string | null
  }): Promise<GithubRepoData | null> => {
    try {
      const headers: Record<string, string> = {
        Accept: "application/vnd.github.v3+json",
      }
      if (args.userAccessToken) {
        headers.Authorization = `Bearer ${args.userAccessToken}`
      }

      const res = args.userAccessToken
        ? await fetch(
            `https://api.github.com/repos/${args.owner}/${args.repo}`,
            { headers }
          )
        : await githubFetch(
            `https://api.github.com/repos/${args.owner}/${args.repo}`
          )

      if (!res.ok || res.status === 404) {
        return null
      }

      return githubRepoSchema.parse(await res.json())
    } catch (error) {
      console.error(
        `Failed to fetch GitHub repo ${args.owner}/${args.repo}:`,
        error
      )
      return null
    }
  }
)

const githubBranchSchema = z.object({
  name: z.string(),
})

export const getBranches = cache(
  async (args: {
    owner: string
    repo: string
    userAccessToken?: string | null
  }): Promise<string[] | null> => {
    try {
      const headers: Record<string, string> = {
        Accept: "application/vnd.github.v3+json",
      }
      if (args.userAccessToken) {
        headers.Authorization = `Bearer ${args.userAccessToken}`
      }

      const res = args.userAccessToken
        ? await fetch(
            `https://api.github.com/repos/${args.owner}/${args.repo}/branches?per_page=100`,
            { headers }
          )
        : await githubFetch(
            `https://api.github.com/repos/${args.owner}/${args.repo}/branches?per_page=100`
          )

      if (!res.ok || res.status === 404) {
        return null
      }

      const branches = z.array(githubBranchSchema).parse(await res.json())
      return branches.map((b) => b.name)
    } catch (error) {
      console.error(
        `Failed to fetch branches for ${args.owner}/${args.repo}:`,
        error
      )
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

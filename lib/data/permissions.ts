import { cacheLife } from "next/cache"

import { getUserAccessToken } from "@/lib/data/github"

type RepoPermissions = {
  admin: boolean
  push: boolean
  pull: boolean
  maintain: boolean
  triage: boolean
}

async function getUserRepoPermissions(
  owner: string,
  repo: string,
  accessToken: string
): Promise<RepoPermissions | null> {
  "use cache: remote"
  cacheLife("hours") // 5 minutes

  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!res.ok) {
      return null
    }

    const data = (await res.json()) as {
      permissions?: RepoPermissions
    }

    return data.permissions ?? null
  } catch {
    return null
  }
}

export async function canModerate(
  userId: string,
  owner: string,
  repo: string
): Promise<boolean> {
  const accessToken = await getUserAccessToken(userId)
  if (!accessToken) {
    return false
  }

  const permissions = await getUserRepoPermissions(owner, repo, accessToken)

  return (
    permissions?.push === true ||
    permissions?.admin === true ||
    permissions?.triage === true
  )
}

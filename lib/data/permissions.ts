import { eq } from "drizzle-orm"
import { db } from "@/lib/db/client"
import { account } from "@/lib/db/schema"
import { redis } from "@/lib/redis"

type RepoPermissions = {
  admin: boolean
  push: boolean
  pull: boolean
  maintain: boolean
  triage: boolean
}

const CACHE_TTL_SECONDS = 5 * 60 // 5 minutes

function permissionsCacheKey(userId: string, owner: string, repo: string) {
  return `repo-permissions:${userId}:${owner}:${repo}`
}

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

export async function getUserRepoPermissions(
  owner: string,
  repo: string,
  accessToken: string
): Promise<RepoPermissions | null> {
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
      permissions?: {
        admin: boolean
        push: boolean
        pull: boolean
        maintain: boolean
        triage: boolean
      }
    }

    return data.permissions ?? null
  } catch {
    return null
  }
}

async function getCachedPermissions(
  userId: string,
  owner: string,
  repo: string
): Promise<RepoPermissions | null | "miss"> {
  const key = permissionsCacheKey(userId, owner, repo)
  const cached = await redis.get<RepoPermissions | "none">(key)
  if (cached === null) {
    return "miss"
  }
  if (cached === "none") {
    return null
  }
  return cached
}

async function setCachedPermissions(
  userId: string,
  owner: string,
  repo: string,
  permissions: RepoPermissions | null
): Promise<void> {
  const key = permissionsCacheKey(userId, owner, repo)
  await redis.set(key, permissions ?? "none", { ex: CACHE_TTL_SECONDS })
}

export async function canModerate(
  userId: string,
  owner: string,
  repo: string
): Promise<boolean> {
  // Check cached permissions
  const cached = await getCachedPermissions(userId, owner, repo)
  if (cached !== "miss") {
    return (
      cached?.push === true || cached?.admin === true || cached?.triage === true
    )
  }

  // Fetch from GitHub
  const accessToken = await getUserAccessToken(userId)
  if (!accessToken) {
    return false
  }

  const permissions = await getUserRepoPermissions(owner, repo, accessToken)

  // Cache the result
  await setCachedPermissions(userId, owner, repo, permissions)

  return (
    permissions?.push === true ||
    permissions?.admin === true ||
    permissions?.triage === true
  )
}

import { eq } from "drizzle-orm"
import { cacheLife } from "next/cache"
import { getUserAccessToken } from "@/lib/data/github"
import { db } from "@/lib/db/client"
import { user } from "@/lib/db/schema"

export type ParsedVisibility =
  | { type: "public" }
  | { type: "repo" }
  | { type: "user"; username: string }

export function parseVisibility(visibility: string): ParsedVisibility {
  if (visibility === "public") return { type: "public" }
  if (visibility === "repo") return { type: "repo" }
  if (visibility.startsWith("user:")) {
    return { type: "user", username: visibility.slice(5) }
  }
  return { type: "public" } // fallback
}

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
  cacheLife("hours")

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

export async function canAccessPrivateRepo(args: {
  userId: string
  owner: string
  repo: string
}): Promise<boolean> {
  const accessToken = await getUserAccessToken(args.userId)
  if (!accessToken) {
    return false
  }

  const permissions = await getUserRepoPermissions(
    args.owner,
    args.repo,
    accessToken
  )
  return (
    permissions?.pull === true ||
    permissions?.push === true ||
    permissions?.admin === true
  )
}

async function getUser(userId: string) {
  const [result] = await db
    .select({ username: user.username })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)
  return result ?? null
}

export async function canViewPost(args: {
  post: { visibility: string; owner: string; repo: string }
  userId: string | null
}): Promise<boolean> {
  const { post, userId } = args
  const vis = parseVisibility(post.visibility)

  if (vis.type === "public") return true
  if (!userId) return false

  if (vis.type === "user") {
    const userRecord = await getUser(userId)
    return userRecord?.username === vis.username
  }

  if (vis.type === "repo") {
    return canAccessPrivateRepo({ userId, owner: post.owner, repo: post.repo })
  }

  return false
}

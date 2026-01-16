"use server"

import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { searchBranches } from "@/lib/data/github"
import { getUserAccessToken } from "@/lib/data/permissions"

export async function searchBranchesAction(
  owner: string,
  repo: string,
  query: string,
  first = 100
): Promise<string[]> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return []
  }

  const accessToken = await getUserAccessToken(session.user.id)
  if (!accessToken) {
    return []
  }

  return searchBranches(owner, repo, query, first, accessToken)
}

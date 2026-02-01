"use server"

import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { hasRepoScope } from "@/lib/data/scopes"

/**
 * Check if the current user has the repo scope granted.
 * Returns false if not authenticated or scope not granted.
 */
export async function checkHasRepoScope(): Promise<boolean> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) {
    return false
  }

  return hasRepoScope(session.user.id)
}

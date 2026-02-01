import { eq } from "drizzle-orm"
import { db } from "@/lib/db/client"
import { account } from "@/lib/db/schema"

/**
 * Check if the user has granted the repo scope for GitHub.
 * The repo scope is needed for build mode (push, PRs).
 */
export async function hasRepoScope(userId: string): Promise<boolean> {
  const githubAccount = await db
    .select({ scope: account.scope })
    .from(account)
    .where(eq(account.userId, userId))
    .limit(1)
    .then((r) => r[0])

  if (!githubAccount?.scope) {
    return false
  }

  // Scopes are stored as space-separated string
  const scopes = githubAccount.scope.split(/[\s,]+/)
  return scopes.includes("repo")
}

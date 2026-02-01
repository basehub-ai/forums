"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { checkCanModerate } from "@/lib/actions/moderation"
import { checkHasRepoScope } from "@/lib/actions/scopes"
import { authClient } from "@/lib/auth-client"

type RepoPermissions = {
  canModerate: boolean
  hasRepoScope: boolean
  isLoading: boolean
}

const RepoPermissionsContext = createContext<RepoPermissions | null>(null)

export function RepoPermissionsProvider({
  owner,
  repo,
  children,
}: {
  owner: string
  repo: string
  children: React.ReactNode
}) {
  const { data: session } = authClient.useSession()
  // Use stable userId instead of full session object to prevent unnecessary re-renders
  const userId = session?.user?.id
  const [canModerate, setCanModerate] = useState(false)
  const [hasRepoScope, setHasRepoScope] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Re-fetch permissions when user changes (e.g., after OAuth redirect)
  useEffect(() => {
    if (!userId) {
      setCanModerate(false)
      setHasRepoScope(false)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    Promise.all([checkCanModerate(owner, repo), checkHasRepoScope()])
      .then(([moderateResult, scopeResult]) => {
        setCanModerate(moderateResult)
        setHasRepoScope(scopeResult)
        setIsLoading(false)
      })
      .catch((error) => {
        console.error("Failed to check permissions:", error)
        setCanModerate(false)
        setHasRepoScope(false)
        setIsLoading(false)
      })
  }, [owner, repo, userId])

  return (
    <RepoPermissionsContext.Provider
      value={{ canModerate, hasRepoScope, isLoading }}
    >
      {children}
    </RepoPermissionsContext.Provider>
  )
}

export function useRepoPermissions() {
  const context = useContext(RepoPermissionsContext)
  if (!context) {
    throw new Error(
      "useRepoPermissions must be used within RepoPermissionsProvider"
    )
  }
  return context
}

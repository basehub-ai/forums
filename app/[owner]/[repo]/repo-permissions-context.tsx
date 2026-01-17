"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { checkCanModerate } from "@/lib/actions/moderation"
import { authClient } from "@/lib/auth-client"

type RepoPermissions = {
  canModerate: boolean
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
  const session = authClient.useSession()
  const [canModerate, setCanModerate] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!session.data?.user) {
      setCanModerate(false)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    checkCanModerate(owner, repo)
      .then((result) => {
        setCanModerate(result)
        setIsLoading(false)
      })
      .catch((error) => {
        console.error("Failed to check moderation permissions:", error)
        setCanModerate(false)
        setIsLoading(false)
      })
  }, [owner, repo, session.data?.user])

  return (
    <RepoPermissionsContext.Provider value={{ canModerate, isLoading }}>
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

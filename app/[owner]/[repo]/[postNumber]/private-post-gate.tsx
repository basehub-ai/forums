"use client"

import { LockIcon } from "lucide-react"
import type { ReactNode } from "react"
import { Container } from "@/components/container"
import { authClient } from "@/lib/auth-client"

type PrivatePostGateProps = {
  visibility: "private" | null
  authorId: string
  children: ReactNode
}

export function PrivatePostGate({
  visibility,
  authorId,
  children,
}: PrivatePostGateProps) {
  const { data: auth, isPending } = authClient.useSession()
  const userId = auth?.user?.id

  if (visibility !== "private") {
    return <>{children}</>
  }

  if (isPending) {
    return (
      <Container>
        <div className="flex min-h-body-min-height items-center justify-center">
          <p className="text-muted">Loading...</p>
        </div>
      </Container>
    )
  }

  if (!userId || userId !== authorId) {
    return (
      <Container>
        <div className="flex min-h-body-min-height flex-col items-center justify-center gap-4">
          <LockIcon className="size-12 text-faint" />
          <div className="text-center">
            <h1 className="font-medium text-lg">Private Post</h1>
            <p className="mt-1 text-muted text-sm">
              This post is private and only visible to its author.
            </p>
          </div>
        </div>
      </Container>
    )
  }

  return <>{children}</>
}

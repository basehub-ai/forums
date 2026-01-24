"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Container } from "@/components/container"
import { Title } from "@/components/typography"
import { authClient } from "@/lib/auth-client"

export default function LoginPage() {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()

  useEffect(() => {
    if (isPending) {
      return
    }
    if (session) {
      router.replace("/")
      return
    }
    authClient.signIn.social({ provider: "github" })
  }, [session, isPending, router])

  return (
    <Container className="flex min-h-[calc(100svh-11.25rem)] items-center justify-center">
      <Title>Redirecting…</Title>
    </Container>
  )
}

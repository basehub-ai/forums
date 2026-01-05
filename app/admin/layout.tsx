import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { Container } from "@/components/container"
import { Title } from "@/components/typography"
import { auth, isAdmin } from "@/lib/auth"

export default async function AdminLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense>
      <AdminLayout>{children}</AdminLayout>
    </Suspense>
  )
}

async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!isAdmin(session?.user)) {
    notFound()
  }

  return (
    <Container>
      <Title className="mb-6">Admin</Title>
      {children}
    </Container>
  )
}

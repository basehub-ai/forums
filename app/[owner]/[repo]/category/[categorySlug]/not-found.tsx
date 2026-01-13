"use client"

import { ExternalLinkIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Container } from "@/components/container"
import { Title } from "@/components/typography"

export default function CategoryNotFound() {
  const pathname = usePathname()
  const parts = pathname.split("/").filter(Boolean)
  const owner = parts[0]
  const repo = parts[1]

  const repoUrl = owner && repo ? `/${owner}/${repo}` : "/"

  return (
    <Container>
      <div className="py-12">
        <Title>404 — Category Not Found</Title>
        <p className="mt-4 text-muted">
          This category doesn't exist in{" "}
          <span className="font-medium text-dim">
            {owner}/{repo}
          </span>
          .
        </p>
        <p className="mt-6 flex items-center gap-4 text-sm">
          <Link className="text-accent hover:underline" href={repoUrl}>
            View all posts in {owner}/{repo}
          </Link>
          <Link className="text-accent hover:underline" href="/">
            Go home
          </Link>
        </p>
      </div>
    </Container>
  )
}

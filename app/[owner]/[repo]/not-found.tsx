"use client"

import { ExternalLinkIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Container } from "@/components/container"
import { Title } from "@/components/typography"

export default function RepoNotFound() {
  const pathname = usePathname()
  const parts = pathname.split("/").filter(Boolean)
  const owner = parts[0]
  const repo = parts[1]

  const githubUrl =
    owner && repo ? `https://github.com/${owner}/${repo}` : "https://github.com"

  return (
    <Container>
      <div className="py-12">
        <Title>404 — Repository Not Found</Title>
        <p className="mt-4 text-muted">
          We couldn't find a repository at{" "}
          <span className="font-medium text-dim">
            {owner}/{repo}
          </span>
          .
        </p>
        <p className="mt-6 flex items-center gap-2 text-sm">
          <span className="text-faint">Does this repo exist on GitHub?</span>
          <Link
            className="flex items-center gap-1 text-accent hover:underline"
            href={githubUrl}
            target="_blank"
          >
            Check on GitHub
            <ExternalLinkIcon className="h-3.5 w-3.5" />
          </Link>
        </p>
        <p className="mt-6">
          <Link className="text-accent hover:underline" href="/">
            Go back home
          </Link>
        </p>
      </div>
    </Container>
  )
}

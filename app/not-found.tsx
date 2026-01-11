import Link from "next/link"
import { Container } from "@/components/container"
import { Title } from "@/components/typography"

export default function NotFound() {
  return (
    <Container>
      <div className="py-12">
        <Title>404 — Page Not Found</Title>
        <p className="mt-4 text-muted">
          The page you're looking for doesn't exist.
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

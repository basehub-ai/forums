import Link from "next/link"
import { Container } from "./container"

export function Footer() {
  return (
    <footer className="mt-auto py-8">
      <Container>
        <nav className="flex w-full justify-between">
          <span className="text-sm">
            Built by{" "}
            <a
              className="underline underline-offset-2"
              href="https://basehub.com"
              rel="noopener noreferrer"
              target="_blank"
            >
              BaseHub
            </a>
            .
          </span>
          <div className="flex items-center gap-x-4">
            <Link
              className="text-sm underline underline-offset-2"
              href="https://basehub.com/privacy"
            >
              Privacy
            </Link>
            <Link
              className="text-sm underline underline-offset-2"
              href="https://github.com/basehub-ai"
            >
              GitHub
            </Link>
            <Link
              className="text-sm underline underline-offset-2"
              href="https://x.com/basehub_ai"
            >
              X
            </Link>
          </div>
        </nav>
      </Container>
    </footer>
  )
}

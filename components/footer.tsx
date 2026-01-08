import Link from "next/link"
import { Container } from "./container"

export function Footer() {
  return (
    <footer className="mt-auto py-8">
      <Container>
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:gap-x-6">
          <Link
            className="font-medium text-dim text-sm hover:text-bright hover:underline"
            href="http://x.com/basehub_ai"
            target="_blank"
          >
            About Us
          </Link>
          <span className="hidden text-border-solid sm:inline">|</span>
          <Link
            className="font-medium text-dim text-sm hover:text-bright hover:underline"
            href="https://forums.basehub.com/basehub-ai/forums/9"
          >
            Pricing
          </Link>
          <span className="hidden text-border-solid sm:inline">|</span>
          <Link
            className="font-medium text-dim text-sm hover:text-bright hover:underline"
            href="https://github.com/basehub-ai/forums"
            target="_blank"
          >
            GitHub
          </Link>
          <span className="hidden text-border-solid sm:inline">|</span>
          <Link
            className="font-medium text-dim text-sm hover:text-bright hover:underline"
            href="/basehub-ai/forums"
          >
            Help
          </Link>
        </nav>
      </Container>
    </footer>
  )
}

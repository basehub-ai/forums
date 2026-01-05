import Link from "next/link"
import { Container } from "./container"

export function Footer() {
  return (
    <footer className="mt-auto py-8">
      <Container>
        {/* <div className="relative border-4 border-faint border-double px-6 py-4"> */}
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <Link
            className="font-medium text-dim text-sm hover:text-bright hover:underline"
            href="http://x.com/basehub_ai"
            target="_blank"
          >
            About Us
          </Link>
          <span className="text-border-solid">|</span>
          <Link
            className="font-medium text-dim text-sm hover:text-bright hover:underline"
            href="/basehub-ai/forums"
            target="_blank"
          >
            Help
          </Link>
          <span className="text-border-solid">|</span>
          <Link
            className="font-medium text-dim text-sm hover:text-bright hover:underline"
            href="https://github.com/basehub-ai/forums"
            target="_blank"
          >
            GitHub
          </Link>
        </nav>
        {/* </div> */}
      </Container>
    </footer>
  )
}

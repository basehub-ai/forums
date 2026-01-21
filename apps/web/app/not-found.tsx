import { MessageCircleXIcon } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/button"
import { Container } from "@/components/container"
import { Subtitle, Title } from "@/components/typography"

export default function NotFound() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <MessageCircleXIcon
        absoluteStrokeWidth
        className="mb-5 text-foreground"
        size={48}
      />
      <Title className="text-bright">404 — Not Found</Title>
      <Subtitle className="mt-1 text-foreground">
        The page you&apos;re looking for doesn&apos;t exist.
      </Subtitle>
      <Link className="mt-5" href="/">
        <Button>Back to home</Button>
      </Link>
    </Container>
  )
}

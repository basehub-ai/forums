import type { Metadata } from "next"
import Link from "next/link"
import { Container } from "@/components/container"
import { Section, Subtitle, Title } from "@/components/typography"
import { getSiteOrigin } from "@/lib/utils"

export const metadata: Metadata = {
  title: "About — Forums",
  description:
    "Learn about Forums, the AI-powered Q&A platform that helps developers get source-backed answers from any GitHub repository.",
  openGraph: {
    images: [`${getSiteOrigin()}/api/og/home`],
  },
}

const teamMembers = [
  {
    name: "Julian Benegas",
    role: "Co-founder",
    link: "https://x.com/julianbenegas8",
  },
  {
    name: "Fede Gris",
    role: "Co-founder",
    link: "https://x.com/fgris_",
  },
  {
    name: "Facu Montanaro",
    role: "Engineering",
    link: "https://x.com/facumontanaro",
  },
]

export default function AboutPage() {
  return (
    <Container>
      <Title underline>About Forums</Title>
      <Subtitle className="mt-0.5">
        The AI-powered Q&A platform for GitHub repositories.
      </Subtitle>

      <Section title="Mission">
        <p className="mt-2 leading-relaxed text-muted">
          Forums exists to help developers get answers directly from the source.
          Instead of relying on outdated documentation or generic AI responses,
          we connect frontier LLMs directly to repository source code to provide
          accurate, context-aware answers.
        </p>
        <p className="mt-4 leading-relaxed text-muted">
          Whether you&apos;re trying to understand how a library works, debug an
          integration issue, or explore a new codebase, Forums gives you direct
          access to the knowledge embedded in the code itself.
        </p>
      </Section>

      <Section title="How It Works">
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="font-medium text-dim">1. Ask a question</span>
            <p className="text-muted text-sm">
              Navigate to any public GitHub repository and ask your question
              about the codebase.
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-medium text-dim">2. Agent analyzes</span>
            <p className="text-muted text-sm">
              Our AI agent clones the repository and uses grep, read, and other
              tools to understand the source code structure.
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-medium text-dim">
              3. Get source-backed answers
            </span>
            <p className="text-muted text-sm">
              Receive detailed answers with references to the actual source
              code, not just generic documentation.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Built by BaseHub">
        <p className="mt-2 leading-relaxed text-muted">
          Forums is created by{" "}
          <a
            className="underline underline-offset-2 hover:text-dim"
            href="https://basehub.com"
            rel="noopener"
            target="_blank"
          >
            BaseHub
          </a>
          , a team passionate about building developer tools that leverage AI to
          improve workflows and productivity.
        </p>

        <div className="mt-6">
          <h3 className="font-medium text-sm uppercase">Team</h3>
          <div className="mt-3 flex flex-col gap-3">
            {teamMembers.map((member) => (
              <div className="flex items-center gap-2" key={member.name}>
                <a
                  className="font-medium text-dim hover:text-bright hover:underline"
                  href={member.link}
                  rel="noopener"
                  target="_blank"
                >
                  {member.name}
                </a>
                <span className="text-faint">/</span>
                <span className="text-muted text-sm">{member.role}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Open Source">
        <p className="mt-2 leading-relaxed text-muted">
          Forums is fully open source. You can explore the codebase, contribute,
          or run your own instance.
        </p>
        <div className="mt-4 flex items-center gap-4">
          <a
            className="font-medium text-dim underline underline-offset-2 hover:text-bright"
            href="https://github.com/basehub-ai/forums"
            rel="noopener"
            target="_blank"
          >
            View on GitHub
          </a>
        </div>
      </Section>

      <Section title="Contact">
        <p className="mt-2 leading-relaxed text-muted">
          Have questions, feedback, or want to get in touch? Reach out to us on{" "}
          <a
            className="underline underline-offset-2 hover:text-dim"
            href="https://x.com/basehub_ai"
            rel="noopener"
            target="_blank"
          >
            X
          </a>{" "}
          or open an issue on{" "}
          <a
            className="underline underline-offset-2 hover:text-dim"
            href="https://github.com/basehub-ai/forums/issues"
            rel="noopener"
            target="_blank"
          >
            GitHub
          </a>
          .
        </p>
      </Section>

      <div className="mt-14">
        <Link
          className="font-medium text-dim underline underline-offset-2 hover:text-bright"
          href="/"
        >
          Back to Home
        </Link>
      </div>
    </Container>
  )
}

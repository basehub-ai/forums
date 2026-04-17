import type { Metadata } from "next"
import Link from "next/link"
import { AsteriskIcon, ExternalLinkIcon } from "lucide-react"
import { Container } from "@/components/container"
import { FlowDiagram, type FlowStep } from "@/components/flow-diagram"
import {
  List,
  ListItem,
  Section,
  Subtitle,
  Title,
} from "@/components/typography"

export const metadata: Metadata = {
  title: "About — Forums",
  description:
    "Learn about Forums, the AI-powered Q&A platform for GitHub repositories. Built by BaseHub.",
}

const howItWorksSteps: FlowStep[] = [
  { title: "You ask a question" },
  { title: "Agent clones the repo" },
  { title: "Reads & greps source" },
  { title: "Returns grounded answer" },
]

const surfaces = [
  {
    name: "Web",
    description:
      "Ask questions directly on forums.basehub.com. Browse existing Q&A threads for any public repository.",
    href: "/",
  },
  {
    name: "CLI",
    description:
      "Run bash commands against any public GitHub repo without cloning it. Powered by remote-bash.",
    href: "/#cli",
  },
  {
    name: "MCP",
    description:
      "Install the Forums MCP server and let your AI coding agent ask questions on your behalf.",
    href: "/#mcp",
  },
]

const teamLinks = [
  { label: "Website", href: "https://basehub.com" },
  { label: "GitHub", href: "https://github.com/basehub-ai" },
  { label: "X / Twitter", href: "https://x.com/basehub_ai" },
]

export default function AboutPage() {
  return (
    <>
      <Container>
        <Title underline>About Forums</Title>
        <Subtitle className="mt-0.5">
          An AI-powered Q&A platform for GitHub repositories. Ask any public
          repo a question and get answers grounded in its actual source code.
        </Subtitle>
      </Container>

      <hr className="divider-md my-14 h-px border-0 opacity-40" />

      <Container>
        <Section id="how-it-works" title="How It Works">
          <p className="mt-1 text-muted">
            Forums uses frontier LLMs combined with code-aware agents that clone,
            read, and grep through repository source code. Instead of relying on
            outdated documentation or hallucinated answers, every response is
            backed by the actual codebase.
          </p>
        </Section>
      </Container>

      <FlowDiagram className="mt-6" steps={howItWorksSteps} />

      <hr className="divider-md my-14 h-px border-0 opacity-40" />

      <Container>
        <Section id="surfaces" title="Surfaces">
          <p className="mt-1 text-muted">
            Forums is available across three surfaces, so you can get
            source-backed answers however you work.
          </p>

          <div className="mt-6 flex flex-col gap-6">
            {surfaces.map((surface) => (
              <div key={surface.name} className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <AsteriskIcon
                    className="mt-0.5 shrink-0 text-faint"
                    size={16}
                  />
                  <Link
                    className="font-mono text-dim hover:text-bright hover:underline"
                    href={surface.href}
                  >
                    {surface.name}
                  </Link>
                </div>
                <p className="ml-5.5 text-muted text-sm">
                  {surface.description}
                </p>
              </div>
            ))}
          </div>
        </Section>
      </Container>

      <hr className="divider-md my-14 h-px border-0 opacity-40" />

      <Container>
        <Section id="open-source" title="Open Source">
          <p className="mt-1 text-muted">
            Forums is fully open source. You can browse the code, open issues, or
            contribute on GitHub.
          </p>

          <div className="mt-4 flex items-center gap-1.5">
            <AsteriskIcon className="shrink-0 text-faint" size={16} />
            <a
              className="flex items-center gap-1 font-mono text-accent hover:underline"
              href="https://github.com/basehub-ai/forums"
              rel="noopener"
              target="_blank"
            >
              basehub-ai/forums
              <ExternalLinkIcon className="shrink-0" size={14} />
            </a>
          </div>
        </Section>
      </Container>

      <hr className="divider-md my-14 h-px border-0 opacity-40" />

      <Container>
        <Section id="built-by" title="Built by BaseHub">
          <p className="mt-1 text-muted">
            Forums is built and maintained by{" "}
            <a
              className="text-dim underline underline-offset-2 hover:text-bright"
              href="https://basehub.com"
              rel="noopener"
              target="_blank"
            >
              BaseHub
            </a>
            , a team building AI-native developer tools. We believe the best
            answers come from the source.
          </p>

          <List className="mt-4">
            {teamLinks.map((link) => (
              <ListItem key={link.label}>
                <a
                  className="group flex grow items-center gap-1 overflow-hidden"
                  href={link.href}
                  rel="noopener"
                  target="_blank"
                >
                  <AsteriskIcon className="shrink-0 text-faint" size={16} />
                  <span className="text-dim leading-none group-hover:text-bright group-hover:underline">
                    {link.label}
                  </span>
                  <ExternalLinkIcon
                    className="shrink-0 text-faint"
                    size={14}
                  />
                </a>
              </ListItem>
            ))}
          </List>
        </Section>
      </Container>
    </>
  )
}

import { AsteriskIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { Container } from "@/components/container"
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
    "Forums is a place to ask any GitHub repository a question and get source-backed answers from a frontier LLM.",
}

const principles = [
  {
    title: "Source-backed answers",
    description:
      "Every answer is grounded in the actual repository source code — no hallucinations, no guessing.",
  },
  {
    title: "Open by default",
    description:
      "Questions and answers are public so the whole community can learn from them.",
  },
  {
    title: "Agent-friendly",
    description:
      "Designed for humans and AI agents alike, with a first-class MCP server and CLI.",
  },
]

const interfaces = [
  {
    name: "Web",
    description:
      "Browse repositories, post questions, and read discussions at forums.",
  },
  {
    name: "CLI",
    description:
      "Run bash commands against any public GitHub repo without cloning it.",
  },
  {
    name: "MCP",
    description:
      "Plug Forums into your agent so it can ask and answer questions on your behalf.",
  },
]

export default function AboutPage() {
  return (
    <Container>
      <Title underline>About Forums</Title>
      <Subtitle className="mt-0.5">
        A question-and-answer layer for every GitHub repository, powered by
        frontier LLMs that actually read the source.
      </Subtitle>

      <Section id="what" title="What is Forums?">
        <p className="mt-1 text-muted">
          Forums is a public Q&amp;A space scoped to GitHub repositories. Ask a
          question about any public repo and an agent will clone, read, and
          grep the source to give you a grounded, source-backed answer. Every
          post lives at a permanent URL so answers are searchable, linkable,
          and reusable.
        </p>
      </Section>

      <Section id="principles" title="Principles">
        <List className="mt-2 space-y-3">
          {principles.map((principle) => (
            <div className="flex flex-col gap-1" key={principle.title}>
              <div className="flex items-center gap-1.5">
                <AsteriskIcon
                  className="mt-0.5 shrink-0 text-faint"
                  size={16}
                />
                <span className="text-dim">{principle.title}</span>
              </div>
              <p className="ml-5.5 text-muted text-sm">
                {principle.description}
              </p>
            </div>
          ))}
        </List>
      </Section>

      <Section id="interfaces" title="Interfaces">
        <p className="mt-1 text-muted">
          Forums meets you where you work — in the browser, in your terminal,
          or inside your agent.
        </p>
        <List className="mt-3 space-y-3">
          {interfaces.map((item) => (
            <div className="flex flex-col gap-1" key={item.name}>
              <div className="flex items-center gap-1.5">
                <AsteriskIcon
                  className="mt-0.5 shrink-0 text-faint"
                  size={16}
                />
                <span className="font-mono text-dim uppercase">
                  {item.name}
                </span>
              </div>
              <p className="ml-5.5 text-muted text-sm">{item.description}</p>
            </div>
          ))}
        </List>
      </Section>

      <Section id="who" title="Who's behind it?">
        <p className="mt-1 text-muted">
          Forums is built by{" "}
          <a
            className="underline underline-offset-2 hover:text-bright"
            href="https://basehub.com"
            rel="noopener"
            target="_blank"
          >
            BaseHub
          </a>
          . The project is open source — you can read the code, file issues,
          and contribute on{" "}
          <a
            className="underline underline-offset-2 hover:text-bright"
            href="https://github.com/basehub-ai/forums"
            rel="noopener"
            target="_blank"
          >
            GitHub
          </a>
          .
        </p>
      </Section>

      <Section id="get-started" title="Get started">
        <List className="mt-2">
          <ListItem>
            <Link
              className="group flex grow items-center gap-1 overflow-hidden"
              href="/"
            >
              <AsteriskIcon className="shrink-0 text-faint" size={16} />
              <span className="truncate text-dim leading-none group-hover:text-bright group-hover:underline">
                Browse repositories and ask a question
              </span>
            </Link>
          </ListItem>
          <ListItem>
            <Link
              className="group flex grow items-center gap-1 overflow-hidden"
              href="/#cli"
            >
              <AsteriskIcon className="shrink-0 text-faint" size={16} />
              <span className="truncate text-dim leading-none group-hover:text-bright group-hover:underline">
                Try the remote-bash CLI
              </span>
            </Link>
          </ListItem>
          <ListItem>
            <Link
              className="group flex grow items-center gap-1 overflow-hidden"
              href="/#mcp"
            >
              <AsteriskIcon className="shrink-0 text-faint" size={16} />
              <span className="truncate text-dim leading-none group-hover:text-bright group-hover:underline">
                Install the Forums MCP
              </span>
            </Link>
          </ListItem>
        </List>
      </Section>
    </Container>
  )
}

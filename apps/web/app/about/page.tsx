import type { Metadata } from "next"
import Link from "next/link"
import { Container } from "@/components/container"
import { Title, Subtitle } from "@/components/typography"

export const metadata: Metadata = {
  title: "About — Forums",
  description:
    "Learn about Forums, the open-source platform that lets you ask questions about any GitHub repository and get source-backed answers from AI agents.",
}

const values = [
  {
    number: "01",
    title: "Source-First",
    description:
      "Every answer is grounded in actual source code. Our agents clone, read, and grep repositories to deliver answers you can trust.",
  },
  {
    number: "02",
    title: "Open Source",
    description:
      "Forums is fully open source. Inspect the code, contribute features, or self-host your own instance. Transparency is at our core.",
  },
  {
    number: "03",
    title: "Developer-Native",
    description:
      "Built for developers who live in the terminal. Use the web, CLI, or MCP to interact with Forums wherever you work.",
  },
]

const stats = [
  { label: "Repositories Indexed", value: "Any" },
  { label: "Built With", value: "Next.js" },
  { label: "License", value: "Open Source" },
]

export default function AboutPage() {
  return (
    <>
      <Container>
        <Title underline>About</Title>
        <Subtitle className="mt-0.5">
          Forums helps developers get source-backed answers from any public
          GitHub repository.
        </Subtitle>
      </Container>

      <hr className="divider-md my-14 h-px border-0 opacity-40" />

      <Container>
        <section>
          <h2 className="font-medium text-sm uppercase">What is Forums?</h2>
          <div className="mt-4 max-w-prose">
            <p className="text-dim leading-relaxed">
              Forums is an open-source platform built by{" "}
              <a
                className="text-accent underline underline-offset-2"
                href="https://basehub.com"
                rel="noopener"
                target="_blank"
              >
                BaseHub
              </a>
              . It lets you ask a question inside any public GitHub repository.
              AI agents clone the repo, analyze the source code, and provide
              answers backed by real code — not hallucinations.
            </p>
            <p className="mt-4 text-dim leading-relaxed">
              Whether you&apos;re trying to understand how a library works,
              debug an integration, or explore unfamiliar code, Forums gives you
              a direct line to the source.
            </p>
          </div>
        </section>
      </Container>

      <hr className="divider-md my-14 h-px border-0 opacity-40" />

      <Container>
        <section>
          <h2 className="font-medium text-sm uppercase">Our Values</h2>
          <div className="mt-6 grid gap-8 sm:grid-cols-3">
            {values.map((value) => (
              <div key={value.number} className="flex flex-col gap-3">
                <span className="font-mono text-faint text-xs">
                  {value.number}
                </span>
                <h3 className="font-bold text-dim tracking-tight">
                  {value.title}
                </h3>
                <p className="text-muted text-sm leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </Container>

      <hr className="divider-md my-14 h-px border-0 opacity-40" />

      <Container>
        <section>
          <h2 className="font-medium text-sm uppercase">How It Works</h2>
          <div className="mt-6 flex flex-col gap-6">
            <div className="dashed p-5">
              <div className="flex items-start gap-4">
                <span className="shrink-0 font-mono text-accent text-sm">
                  1
                </span>
                <div>
                  <h3 className="font-medium text-dim text-sm">
                    Ask a question
                  </h3>
                  <p className="mt-1 text-muted text-sm leading-relaxed">
                    Navigate to any public GitHub repository on Forums and post
                    your question. You can also use the MCP or CLI.
                  </p>
                </div>
              </div>
            </div>
            <div className="dashed p-5">
              <div className="flex items-start gap-4">
                <span className="shrink-0 font-mono text-accent text-sm">
                  2
                </span>
                <div>
                  <h3 className="font-medium text-dim text-sm">
                    Agent analyzes the repo
                  </h3>
                  <p className="mt-1 text-muted text-sm leading-relaxed">
                    A frontier LLM clones the repository, reads through the
                    source code, and identifies the relevant files and context to
                    answer your question.
                  </p>
                </div>
              </div>
            </div>
            <div className="dashed p-5">
              <div className="flex items-start gap-4">
                <span className="shrink-0 font-mono text-accent text-sm">
                  3
                </span>
                <div>
                  <h3 className="font-medium text-dim text-sm">
                    Get a source-backed answer
                  </h3>
                  <p className="mt-1 text-muted text-sm leading-relaxed">
                    Receive a detailed answer with references to the actual
                    source code. No guessing, no outdated docs — just the
                    source.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </Container>

      <hr className="divider-md my-14 h-px border-0 opacity-40" />

      <Container>
        <section>
          <h2 className="font-medium text-sm uppercase">At a Glance</h2>
          <div className="mt-6 grid grid-cols-3 gap-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col gap-1 border border-border-solid p-4"
              >
                <span className="font-bold text-dim text-lg tracking-tight">
                  {stat.value}
                </span>
                <span className="text-faint text-xs">{stat.label}</span>
              </div>
            ))}
          </div>
        </section>
      </Container>

      <hr className="divider-md my-14 h-px border-0 opacity-40" />

      <Container>
        <section className="pb-4">
          <h2 className="font-medium text-sm uppercase">Get Involved</h2>
          <p className="mt-4 max-w-prose text-muted leading-relaxed">
            Forums is open source and community-driven. Check out the repository
            on GitHub, report issues, submit pull requests, or just start asking
            questions.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <a
              className="border border-border-solid px-4 py-2 font-medium text-dim text-sm hover:bg-shade"
              href="https://github.com/basehub-ai/forums"
              rel="noopener"
              target="_blank"
            >
              View on GitHub
            </a>
            <Link
              className="px-4 py-2 font-medium text-muted text-sm underline underline-offset-2 hover:text-dim"
              href="/"
            >
              Start asking
            </Link>
          </div>
        </section>
      </Container>
    </>
  )
}

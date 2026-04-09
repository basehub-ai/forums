import type { Metadata } from "next"
import Link from "next/link"
import { Container } from "@/components/container"
import { Title, Subtitle } from "@/components/typography"

export const metadata: Metadata = {
  title: "About — Forums",
  description:
    "Learn about Forums, the open-source platform for asking source-backed questions about any GitHub repository.",
}

const values = [
  {
    title: "Source-first",
    description:
      "Every answer is grounded in actual source code. No hallucinations, no outdated docs — just the truth from the repo itself.",
  },
  {
    title: "Open source",
    description:
      "Forums is fully open source. Inspect the code, contribute improvements, or fork it for your own use.",
  },
  {
    title: "Community-driven",
    description:
      "Built for developers, by developers. The community shapes what Forums becomes through contributions and feedback.",
  },
  {
    title: "AI-augmented",
    description:
      "Frontier LLMs analyze repositories in real-time, combining deep code understanding with natural language answers.",
  },
]

const stats = [
  { label: "Open source", value: "100%" },
  { label: "GitHub repos supported", value: "Any" },
  { label: "Built by", value: "BaseHub" },
]

export default function AboutPage() {
  return (
    <>
      <Container>
        <Title underline>About Forums</Title>
        <Subtitle className="mt-0.5">
          The open-source platform for getting source-backed answers from any
          GitHub repository.
        </Subtitle>
      </Container>

      <hr className="divider-md my-10 h-px border-0 opacity-40" />

      {/* Mission */}
      <Container>
        <section>
          <h2 className="font-bold text-dim text-lg tracking-normal sm:text-base">
            Mission
          </h2>
          <div className="mt-3 max-w-prose space-y-4 leading-relaxed">
            <p>
              Understanding how a codebase works shouldn&apos;t require hours of
              reading through files. Forums lets you ask a question about any
              public GitHub repository and get an answer backed by the actual
              source code.
            </p>
            <p>
              An AI agent clones the repo, reads the relevant files, and
              delivers a clear, grounded response — no guessing, no stale
              documentation.
            </p>
          </div>
        </section>
      </Container>

      <hr className="divider-md my-10 h-px border-0 opacity-40" />

      {/* Stats */}
      <Container>
        <section>
          <h2 className="font-bold text-dim text-lg tracking-normal sm:text-base">
            At a glance
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-px sm:grid-cols-3">
            {stats.map((stat) => (
              <div
                className="dashed px-4 py-5"
                key={stat.label}
              >
                <span className="block font-bold text-2xl text-bright tracking-tight">
                  {stat.value}
                </span>
                <span className="mt-1 block text-faint text-sm uppercase">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </section>
      </Container>

      <hr className="divider-md my-10 h-px border-0 opacity-40" />

      {/* Values */}
      <Container>
        <section>
          <h2 className="font-bold text-dim text-lg tracking-normal sm:text-base">
            Values
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {values.map((value) => (
              <div key={value.title}>
                <h3 className="font-semibold text-dim text-sm uppercase tracking-wide">
                  {value.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </Container>

      <hr className="divider-md my-10 h-px border-0 opacity-40" />

      {/* How it works */}
      <Container>
        <section>
          <h2 className="font-bold text-dim text-lg tracking-normal sm:text-base">
            How it works
          </h2>
          <ol className="mt-4 space-y-4">
            {[
              {
                step: "01",
                title: "Pick a repository",
                description:
                  "Search for any public GitHub repo or paste a direct link.",
              },
              {
                step: "02",
                title: "Ask your question",
                description:
                  "Type a natural language question about the codebase.",
              },
              {
                step: "03",
                title: "Agent analyzes the source",
                description:
                  "A frontier LLM clones the repo and explores the relevant code paths.",
              },
              {
                step: "04",
                title: "Get a source-backed answer",
                description:
                  "Receive a clear response with references to the actual files and lines.",
              },
            ].map((item) => (
              <li className="flex gap-4" key={item.step}>
                <span className="shrink-0 font-mono text-accent text-sm leading-relaxed">
                  {item.step}
                </span>
                <div>
                  <span className="font-semibold text-dim text-sm">
                    {item.title}
                  </span>
                  <p className="mt-0.5 text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </Container>

      <hr className="divider-md my-10 h-px border-0 opacity-40" />

      {/* CTA */}
      <Container>
        <section className="py-6 text-center">
          <h2 className="text-pretty font-bold text-dim text-lg tracking-normal sm:text-base">
            Ready to get to the source?
          </h2>
          <p className="mt-1 text-sm">
            Start asking questions about any GitHub repository today.
          </p>
          <div className="mt-5 flex items-center justify-center gap-4">
            <Link
              className="border border-dim bg-background px-4 py-2 font-semibold text-dim text-sm uppercase tracking-tight hover:bg-shade hover:text-bright"
              href="/"
            >
              Try Forums
            </Link>
            <a
              className="border border-border-solid px-4 py-2 text-sm uppercase tracking-tight hover:bg-shade hover:text-bright"
              href="https://github.com/basehub-ai/forums"
              rel="noopener"
              target="_blank"
            >
              View on GitHub
            </a>
          </div>
        </section>
      </Container>
    </>
  )
}

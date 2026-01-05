import { cacheLife } from "next/cache"
import { Container } from "@/components/container"
import { RepoListWithSearch } from "@/components/repo-list-with-search"
import { Subtitle, Title } from "@/components/typography"
import { getTopRepositories } from "@/lib/top-repos"

export default async function Home() {
  "use cache"
  cacheLife("minutes")

  const topRepos = await getTopRepositories(30)

  return (
    <Container>
      <Title>Get to the source!</Title>
      <Subtitle className="mt-2">
        Ask a question inside any GitHub Repository. AI Agents will clone and
        read and grep the source code to provide the best answer.
      </Subtitle>
      <RepoListWithSearch now={Date.now()} topRepos={topRepos} />
      <pre
        aria-hidden="true"
        className="mx-auto mt-10 w-fit overflow-x-auto text-muted text-xs leading-tight"
      >{`    ┌───────────────────┐
    │  Ask a question   │
    └─────────┬─────────┘
              │
              ▼
┌───────────────────────────┐
│  Repo cloned in sandbox   │
└─────────────┬─────────────┘
              │
              ▼
┌───────────────────────────┐
│  Agent explores codebase  │
└─────────────┬─────────────┘
              │
              ▼
    ╔═══════════════════╗
    ║  Source-backed    ║
    ║      answer       ║
    ╚═══════════════════╝`}</pre>
    </Container>
  )
}

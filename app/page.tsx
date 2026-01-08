import { cacheLife } from "next/cache"
import { Container } from "@/components/container"
import { FlowDiagram, type FlowStep } from "@/components/flow-diagram"
import { RepoListWithSearch } from "@/components/repo-list-with-search"
import { Subtitle, Title } from "@/components/typography"
import { getTopRepositories } from "@/lib/top-repos"

const flowSteps: FlowStep[] = [
  { title: "Ask a question" },
  { title: "Repo cloned in sandbox" },
  { title: "Agent explores codebase" },
  { title: "Source-backed answer" },
]

export default async function Home() {
  "use cache"
  cacheLife("minutes")

  const topRepos = await getTopRepositories(10)

  return (
    <Container>
      <Title>Get to the source!</Title>
      <Subtitle className="mt-2">
        Ask a question inside any GitHub Repository. AI Agents will clone and
        read and grep the source code to provide the best answer.
      </Subtitle>
      <RepoListWithSearch now={Date.now()} topRepos={topRepos} />

      <FlowDiagram className="mt-10" steps={flowSteps} />
    </Container>
  )
}

import { AsteriskIcon } from "lucide-react"
import { cacheLife } from "next/cache"
import Link from "next/link"
import { Container } from "@/components/container"
import { FlowDiagram, type FlowStep } from "@/components/flow-diagram"
import { RepoListWithSearch } from "@/components/repo-list-with-search"
import { List, ListItem, Subtitle, Title } from "@/components/typography"
import { getLatestPosts } from "@/lib/latest-posts"
import { getTopRepositories } from "@/lib/top-repos"

const flowSteps: FlowStep[] = [
  { title: "Ask a question" },
  { title: "Agent analyzes the repo" },
  { title: "Get source-backed answer" },
]

export default async function Home() {
  "use cache"
  cacheLife("minutes")

  const [topRepos, latestPosts] = await Promise.all([
    getTopRepositories(5),
    getLatestPosts(5),
  ])

  return (
    <Container>
      <Title>Ask any repo. Get source-backed answers.</Title>
      <Subtitle className="mt-0.5">
        Straight from the code. No stale docs. No cloning.
      </Subtitle>

      <RepoListWithSearch now={Date.now()} topRepos={topRepos} />

      {latestPosts.length > 0 && (
        <div className="mt-10">
          <div className="relative mb-2">
            <hr className="divider-md absolute top-1/2 left-0 w-full -translate-y-1/2 border-0" />
            <h2 className="relative z-10 w-fit bg-background pr-2 font-medium text-sm uppercase">
              Recent Questions
            </h2>
          </div>
          <List className="mt-2">
            {latestPosts.map((post) => (
              <ListItem key={post.id}>
                <Link
                  className="group flex grow items-start gap-1 overflow-hidden"
                  href={`/${post.owner}/${post.repo}/${post.number}`}
                >
                  <AsteriskIcon
                    absoluteStrokeWidth
                    className="mt-0.5 shrink-0 text-faint"
                    size={16}
                  />
                  <div className="min-w-0">
                    <span className="text-dim group-hover:text-bright group-hover:underline">
                      {post.title || `Post #${post.number}`}
                    </span>
                    <span className="ml-2 text-faint text-sm">
                      {post.owner}/{post.repo}
                    </span>
                  </div>
                </Link>
              </ListItem>
            ))}
          </List>
        </div>
      )}

      <FlowDiagram className="mt-10" steps={flowSteps} />
    </Container>
  )
}

import { cacheTag } from "next/cache"
import { Suspense } from "react"
import { getThreadsByRepo } from "@/lib/redis"
import { AgentProvider } from "./[threadId]/agent-context"
import { ThreadWithComposer } from "./[threadId]/thread"
import { ActiveThreads } from "./active-threads"

export default async function RepoPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>
}) {
  "use cache"

  const { owner, repo } = await params

  cacheTag(`repo:${owner}:${repo}`)

  const threads = await getThreadsByRepo(owner, repo)

  return (
    <AgentProvider>
      <ThreadWithComposer initialMessages={[]} />
      <Suspense>
        <ActiveThreads owner={owner} repo={repo} threads={threads} />
      </Suspense>
    </AgentProvider>
  )
}

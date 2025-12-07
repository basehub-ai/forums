import { cacheTag } from "next/cache"
import { getThreadsByRepo, redis, type StoredThread } from "@/lib/redis"
import { AgentProvider } from "./[threadId]/agent-context"
import { ThreadWithComposer } from "./[threadId]/thread"
import { ActiveThreads } from "./active-threads"

export const generateStaticParams = async () => {
  let cursor: string | undefined
  const keys: string[] = []
  while (cursor !== "0") {
    const [newCursor, newKeys] = await redis.scan(cursor ?? "0", {
      count: 1000,
      match: "thread:meta:*",
    })
    keys.push(...newKeys)
    cursor = newCursor
  }

  const added = new Set<string>()
  return await Promise.all(
    keys.map(async (key) => {
      const thread = await redis.get<StoredThread>(key)
      if (!thread) {
        return null
      }
      if (added.has(`${thread.owner}/${thread.repo}`)) {
        return null
      }
      added.add(`${thread.owner}/${thread.repo}`)
      return { owner: thread.owner, repo: thread.repo }
    })
  ).then((params) => params.filter((p) => p !== null))
}

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
      <ActiveThreads owner={owner} repo={repo} threads={threads} />
    </AgentProvider>
  )
}

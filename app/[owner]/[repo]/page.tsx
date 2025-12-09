import { and, desc, eq } from "drizzle-orm"
import { cacheTag } from "next/cache"
import { notFound } from "next/navigation"
import { db } from "@/lib/db/client"
import { threads } from "@/lib/db/schema"
import { toClientThread } from "@/lib/db/threads"
import { AgentProvider } from "./[threadId]/agent-context"
import { ThreadWithComposer } from "./[threadId]/thread"
import { ActiveThreads } from "./active-threads"

export const generateStaticParams = async () => {
  const repos = (
    await db
      .selectDistinctOn([threads.owner, threads.repo], {
        owner: threads.owner,
        repo: threads.repo,
      })
      .from(threads)
  ).map((r) => ({ owner: r.owner, repo: r.repo }))

  return repos.length > 0 ? repos : [{ owner: "basehub-ai", repo: "forums" }]
}

export default async function RepoPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>
}) {
  "use cache"

  const { owner, repo } = await params
  cacheTag(`repo:${owner}:${repo}`)
  const [repoThreads, repoData] = await Promise.all([
    db
      .select()
      .from(threads)
      .where(and(eq(threads.owner, owner), eq(threads.repo, repo)))
      .orderBy(desc(threads.id)),
    fetch(`https://api.github.com/repos/${owner}/${repo}`).then(async (res) => {
      if (!res.ok || res.status === 404) {
        return null
      }
      const data = await res.json()
      return data
    }),
  ])

  if (!repoData) {
    return notFound()
  }

  const clientThreads = repoThreads.map(toClientThread)

  return (
    <AgentProvider>
      <ThreadWithComposer initialMessages={[]} />
      <ActiveThreads owner={owner} repo={repo} threads={clientThreads} />
    </AgentProvider>
  )
}

import { asc, eq } from "drizzle-orm"
import { cacheTag } from "next/cache"
import { notFound } from "next/navigation"
import { db } from "@/lib/db/client"
import { messages, threads } from "@/lib/db/schema"
import { toClientThread } from "@/lib/db/threads"
import { AgentProvider } from "./agent-context"
import { RefreshOnReady } from "./messages"
import { ThreadWithComposer } from "./thread"

export const generateStaticParams = async () => {
  const allThreads = await db.select().from(threads)

  return allThreads.map((thread) => ({
    owner: thread.owner,
    repo: thread.repo,
    threadId: thread.id,
  }))
}

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string; threadId: string }>
}) {
  "use cache"

  const { threadId, owner, repo } = await params
  if (!threadId) {
    notFound()
  }

  cacheTag(`thread:${threadId}`)

  const [[thread], rawMessages] = await Promise.all([
    db.select().from(threads).where(eq(threads.id, threadId)).limit(1),
    db
      .select()
      .from(messages)
      .where(eq(messages.threadId, threadId))
      .orderBy(asc(messages.createdAt)),
  ])

  if (!thread) {
    notFound()
  }

  const threadMessages = rawMessages.map((row) => row.content)

  return (
    <AgentProvider thread={toClientThread(thread)}>
      <ThreadWithComposer
        initialMessages={threadMessages}
        owner={owner}
        repo={repo}
        title={thread.title ?? undefined}
      />
      <RefreshOnReady threadId={threadId} />
    </AgentProvider>
  )
}

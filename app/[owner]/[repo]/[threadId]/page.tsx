import { cacheTag } from "next/cache"
import { notFound } from "next/navigation"
import {
  getMessages,
  getStreamId,
  redis,
  type StoredThread,
  threadKey,
} from "@/lib/redis"
import { AgentProvider } from "./agent-context"
import { Composer } from "./composer"
import { MessagesStatic, MessagesStream } from "./messages"

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

  return await Promise.all(
    keys.map(async (key) => {
      const thread = await redis.get<StoredThread>(key)
      if (!thread) {
        return null
      }
      return { owner: thread.owner, repo: thread.repo, threadId: thread.id }
    })
  ).then((params) => params.filter((p) => p !== null))
}

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string; threadId: string }>
}) {
  "use cache"

  const { threadId } = await params
  if (!threadId) {
    notFound()
  }

  cacheTag(`thread:${threadId}`)

  const [thread, messages, streamId] = await Promise.all([
    redis.get<StoredThread>(threadKey(threadId)),
    getMessages(threadId),
    getStreamId(threadId),
  ])

  if (!thread) {
    notFound()
  }

  return (
    <AgentProvider
      thread={{
        id: thread.id,
        streamId,
        owner: thread.owner,
        repo: thread.repo,
      }}
    >
      <div>
        <div className="space-y-4">
          <MessagesStatic messages={messages} />
          <MessagesStream />
        </div>
        <Composer />
      </div>
    </AgentProvider>
  )
}

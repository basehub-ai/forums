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
import { Messages } from "./messages"

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string; threadId: string }>
}) {
  const { threadId } = await params
  if (!threadId) {
    notFound()
  }

  const [thread, messages, streamId] = await Promise.all([
    redis.get<StoredThread>(threadKey(threadId)),
    getMessages(threadId),
    getStreamId(threadId),
  ])

  if (!thread) {
    notFound()
  }

  return (
    <AgentProvider thread={{ ...thread, messages, streamId }}>
      <div>
        <Messages />
        <Composer />
      </div>
    </AgentProvider>
  )
}

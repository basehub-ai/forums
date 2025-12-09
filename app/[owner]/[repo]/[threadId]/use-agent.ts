import { useChat } from "@ai-sdk/react"
import { WorkflowChatTransport } from "@workflow/ai"
import { usePathname, useRouter } from "next/navigation"
import * as React from "react"
import type { GitContext } from "@/agent"
import type { AgentUIMessage } from "@/agent/types"
import type { InterruptRequest } from "@/app/api/threads/[threadId]/interrupt/route"
import type { ThreadRequest } from "@/app/api/threads/[threadId]/route"
import type { ClientThread } from "@/lib/db/threads"
import { nanoid } from "@/lib/utils"

export function useAgent({
  basePath,
  gitContext,
  thread,
  model,
}: {
  basePath: string
  gitContext: GitContext
  thread?: ClientThread
  model: string
}) {
  const resumedRef = React.useRef(false)
  const [queue, setQueue] = React.useState<
    Array<Omit<AgentUIMessage, "id" | "role">>
  >([])
  const toSendRef = React.useRef<Array<AgentUIMessage>>([])
  const [threadId, setThreadId] = React.useState(() => thread?.id || nanoid())
  const router = useRouter()
  const isNewThread = !thread?.id
  const pathname = usePathname()
  const [softNavigateToNewThread, setSoftNavigateToNewThread] =
    React.useState(false)

  const {
    messages,
    resumeStream,
    sendMessage: sendMessageRaw,
    status,
    setMessages,
  } = useChat<AgentUIMessage>({
    id: threadId,
    transport: new WorkflowChatTransport({
      prepareSendMessagesRequest: (config) => {
        const newMessages = toSendRef.current
        toSendRef.current = []
        return {
          ...config,
          api: `/api/threads/${config.id}`,
          body: {
            model,
            messages: newMessages,
            now: Date.now(),
            gitContext,
          } satisfies ThreadRequest,
        }
      },
      prepareReconnectToStreamRequest: (config) => ({
        ...config,
        api: `/api/threads/${config.id}`,
      }),
      onChatSendMessage: () => {
        if (isNewThread) {
          setSoftNavigateToNewThread(true)
        }
      },
      maxConsecutiveErrors: 5,
    }),
  })

  React.useEffect(() => {
    if (
      softNavigateToNewThread &&
      window.location.pathname !== `${basePath}/${threadId}`
    ) {
      window.history.pushState(null, "", `${basePath}/${threadId}`)
    }
  }, [softNavigateToNewThread, threadId, basePath])

  React.useEffect(() => {
    const realPathname = window.location.pathname
    if (softNavigateToNewThread) {
      if (realPathname !== `${basePath}/${threadId}`) {
        setThreadId(nanoid())
        setSoftNavigateToNewThread(false)
      }
    } else if (
      realPathname !== `${basePath}/${threadId}` &&
      pathname.startsWith(basePath)
    ) {
      const actualChatId = realPathname.split("/")[2]
      if (actualChatId) {
        router.refresh()
      }
    }
  }, [threadId, pathname, softNavigateToNewThread, router, basePath])

  React.useEffect(() => {
    if (thread?.streamId && !resumedRef.current && status === "ready") {
      resumedRef.current = true
      resumeStream()
    }
  }, [thread?.streamId, resumeStream, status])

  const sendMessages = React.useCallback(
    async (newMessages: Array<Omit<AgentUIMessage, "id" | "role">>) => {
      if (status === "ready") {
        toSendRef.current = [
          ...toSendRef.current,
          ...newMessages.map(
            (m) => ({ ...m, id: nanoid(), role: "user" }) as const
          ),
        ]
        setMessages((prev) => [...prev, ...toSendRef.current])
        await sendMessageRaw()
        return
      }
      setQueue((curr) => [...curr, ...newMessages])
      await fetch(`/api/threads/${threadId}/interrupt`, {
        method: "POST",
        body: JSON.stringify({ now: Date.now() } satisfies InterruptRequest),
      })
    },
    [threadId, sendMessageRaw, status, setMessages]
  )

  const removeFromQueue = React.useCallback((index: number) => {
    setQueue((curr) => curr.filter((_, i) => i !== index))
  }, [])

  React.useEffect(() => {
    if (status === "ready" && queue.length > 0) {
      sendMessages(queue).catch(() => {
        setQueue((curr) => [...queue, ...curr])
      })
      setQueue([])
    }
  }, [sendMessages, status, queue])

  return {
    threadId,
    sendMessages,
    messages,
    queue,
    status,
    removeFromQueue,
  }
}

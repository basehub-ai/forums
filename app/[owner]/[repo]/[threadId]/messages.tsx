"use client"

import { Fragment } from "react/jsx-runtime"
import { Streamdown } from "streamdown"
import type { AgentUIMessage } from "@/agent/types"
import { cn } from "@/lib/utils"
import { useAgentStore } from "./agent-store"

type MessageItemProps = {
  message: AgentUIMessage
  isStreaming?: boolean
}

const MessageItem = ({ message, isStreaming }: MessageItemProps) => {
  const isSystem = message.role === "system"
  const isUser = message.role === "user"
  const isAssistant = message.role === "assistant"
  const isAnimating = !!isStreaming && message.role === "assistant"

  return (
    <div
      className={cn("mb-4 rounded-lg", {
        "border p-4": isUser || isSystem,
        "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950":
          isUser,
        "": isAssistant,
        "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950":
          isSystem,
      })}
    >
      <div className="mb-2 font-semibold text-sm capitalize">
        {message.role}
      </div>
      <div className="space-y-2">
        {message.parts.map((part, idx) => {
          if (part.type === "text") {
            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: .
              <Fragment key={idx}>
                <Streamdown
                  isAnimating={isAnimating}
                  mode={isAnimating ? "streaming" : "static"}
                >
                  {part.text}
                </Streamdown>
              </Fragment>
            )
          }

          return (
            <pre
              className="overflow-x-auto rounded bg-gray-900 p-3 text-gray-100 text-xs"
              // biome-ignore lint/suspicious/noArrayIndexKey: .
              key={idx}
            >
              <code>{JSON.stringify(part, null, 2)}</code>
            </pre>
          )
        })}
      </div>
    </div>
  )
}

type MessagesProps = {
  messages: AgentUIMessage[]
}

export const MessagesStatic = ({ messages }: MessagesProps) => {
  return (
    <>
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
    </>
  )
}

export const MessagesStream = () => {
  const streamMessages = useAgentStore((state) => state.messages)

  return (
    <>
      {streamMessages.map((message) => (
        <MessageItem isStreaming key={message.id} message={message} />
      ))}
    </>
  )
}

"use client"

import { useAgentStore } from "./agent-store"

export const Messages = () => {
  const messages = useAgentStore((state) => state.messages)

  return (
    <div>
      {messages.map((message) => (
        <div key={message.id}>{JSON.stringify(message)}</div>
      ))}
    </div>
  )
}

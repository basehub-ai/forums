import { Fragment } from "react"
import { Streamdown } from "streamdown"
import type { AgentUIMessage } from "@/agent/types"

type CommentContentProps = {
  content: AgentUIMessage[]
  isStreaming?: boolean
}

export function CommentContent({
  content,
  isStreaming = false,
}: CommentContentProps) {
  return (
    <div className="space-y-2">
      {content.map((msg) => (
        <Fragment key={msg.id}>
          {msg.parts.map((part, idx) => {
            if (part.type === "text") {
              return (
                <Streamdown
                  isAnimating={isStreaming}
                  // biome-ignore lint/suspicious/noArrayIndexKey: .
                  key={idx}
                  mode={isStreaming ? "streaming" : "static"}
                >
                  {part.text}
                </Streamdown>
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
        </Fragment>
      ))}
    </div>
  )
}

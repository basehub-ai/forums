"use client"

import { CheckIcon, FileTextIcon } from "lucide-react"
import { useState } from "react"
import type { AgentUIMessage } from "@/agent/types"
import { Tooltip } from "@/components/ui/tooltip"

function convertMessagesToMarkdown(messages: AgentUIMessage[]): string {
  return messages
    .map((msg) => {
      if (msg.role === "user" || msg.role === "assistant") {
        const parts = msg.parts
          .map((part) => {
            if (typeof part === "string") {
              return part
            }
            if (part.type === "text") {
              return part.text
            }
            return ""
          })
          .filter(Boolean)
        return parts.join("\n\n")
      }
      return ""
    })
    .filter(Boolean)
    .join("\n\n")
}

export function CopyMarkdownButton({ content }: { content: AgentUIMessage[] }) {
  const [isCopied, setIsCopied] = useState(false)

  const Icon = isCopied ? CheckIcon : FileTextIcon

  const copyToClipboard = () => {
    const markdown = convertMessagesToMarkdown(content)
    navigator.clipboard.writeText(markdown)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        className="flex size-6 cursor-pointer items-center justify-center pl-0.5 text-muted-foreground text-xs"
        onClick={copyToClipboard}
      >
        <Icon absoluteStrokeWidth className="size-4" />
      </Tooltip.Trigger>
      <Tooltip.Popup>{isCopied ? "Copied" : "Copy as markdown"}</Tooltip.Popup>
    </Tooltip.Root>
  )
}

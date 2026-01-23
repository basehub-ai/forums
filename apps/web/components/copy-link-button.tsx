"use client"

import { CheckIcon, Link2Icon } from "lucide-react"
import { useState } from "react"
import { Tooltip } from "@/components/ui/tooltip"

export function CopyLinkButton({
  owner,
  repo,
  postNumber,
  commentNumber,
}: {
  owner: string
  repo: string
  postNumber: string
  commentNumber: string
}) {
  const [isCopied, setIsCopied] = useState(false)

  const Icon = isCopied ? CheckIcon : Link2Icon

  const copyToClipboard = () => {
    navigator.clipboard.writeText(
      `${window.location.origin}/${owner}/${repo}/${postNumber}#${commentNumber}`
    )
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger
          className="flex size-6 cursor-pointer items-center justify-center px-1.5 text-muted-foreground text-xs"
          onClick={copyToClipboard}
        >
          <Icon absoluteStrokeWidth className="size-4 shrink-0" />
        </Tooltip.Trigger>
        <Tooltip.Popup>
          {isCopied ? "Copied" : "Copy link to this comment"}
        </Tooltip.Popup>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}

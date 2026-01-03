"use client"

import { Tooltip } from "@base-ui/react/tooltip"
import { CheckIcon, LinkIcon } from "lucide-react"
import { useState } from "react"

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

  const Icon = isCopied ? CheckIcon : LinkIcon

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
          className="text-muted-foreground text-xs"
          onClick={copyToClipboard}
        >
          <Icon className="size-4" />
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner>
            <Tooltip.Popup>
              {isCopied ? "Copied" : "Copy link to this comment"}
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}

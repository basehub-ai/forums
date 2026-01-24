"use client"

import { CheckIcon, CopyIcon } from "lucide-react"
import { useState } from "react"

export function CopyIdButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(id)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      className="text-dim hover:text-muted"
      onClick={copy}
      title={copied ? "Copied!" : "Copy ID"}
      type="button"
    >
      {copied ? (
        <CheckIcon className="size-3.5" />
      ) : (
        <CopyIcon className="size-3.5" />
      )}
    </button>
  )
}

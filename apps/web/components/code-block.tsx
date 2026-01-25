"use client"

import { CheckIcon, CopyIcon } from "lucide-react"
import { useState } from "react"
import { Streamdown } from "streamdown"
import { Tooltip } from "@/components/ui/tooltip"

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const Icon = copied ? CheckIcon : CopyIcon

  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        className="absolute top-1 right-1 flex size-6 cursor-pointer items-center justify-center text-muted hover:text-dim"
        onClick={copy}
      >
        <Icon absoluteStrokeWidth className="size-4 shrink-0" />
      </Tooltip.Trigger>
      <Tooltip.Popup>{copied ? "Copied" : "Copy"}</Tooltip.Popup>
    </Tooltip.Root>
  )
}

export function CodeBlock({
  code,
  language,
  showCopy = true,
}: {
  code: string
  language: string
  showCopy?: boolean
}) {
  return (
    <div className="relative">
      {showCopy && <CopyButton text={code} />}
      <Streamdown
        components={{
          pre: (props) => (
            <pre
              className="min-h-8 overflow-x-auto bg-shade px-2 py-1 text-sm"
              {...props}
            />
          ),
          code: (props) => <code className="font-mono" {...props} />,
        }}
        mode="static"
        shikiTheme={["github-light", "github-dark"]}
      >
        {`\`\`\`${language}\n${code}\n\`\`\``}
      </Streamdown>
    </div>
  )
}

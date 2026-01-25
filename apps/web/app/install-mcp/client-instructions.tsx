"use client"

import { Streamdown } from "streamdown"

const streamdownComponents = {
  p: (props: React.ComponentProps<"p">) => (
    <p className="text-muted leading-relaxed" {...props} />
  ),
  strong: (props: React.ComponentProps<"strong">) => (
    <strong className="font-semibold text-dim" {...props} />
  ),
  code: (props: React.ComponentProps<"code">) => (
    <code
      className="bg-dim/5 px-1 py-0.5 font-mono text-[0.9em] text-highlight-yellow"
      {...props}
    />
  ),
  ol: (props: React.ComponentProps<"ol">) => (
    <ol className="list-decimal space-y-1 pl-6 text-muted" {...props} />
  ),
  li: (props: React.ComponentProps<"li">) => <li {...props} />,
}

export function Instructions({ children }: { children: string }) {
  return (
    <Streamdown components={streamdownComponents} mode="static">
      {children}
    </Streamdown>
  )
}

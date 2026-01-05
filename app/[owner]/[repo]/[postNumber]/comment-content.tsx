"use client"

import { Collapsible } from "@base-ui/react/collapsible"
import type { ToolUIPart } from "ai"
import {
  type ComponentProps,
  Fragment,
  type ReactNode,
  useEffect,
  useState,
} from "react"
import { Streamdown } from "streamdown"
import type { AgentUIMessage } from "@/agent/types"
import { ERROR_CODES } from "@/lib/errors"

function Heading({
  level,
  children,
  ...props
}: ComponentProps<"h1"> & { level: 1 | 2 | 3 | 4 | 5 | 6 }) {
  const Tag = `h${level}` as const
  const prefix = "#".repeat(level)
  return (
    <Tag
      className="relative mt-6 mb-2 font-semibold text-dim first:mt-0"
      {...props}
    >
      <span className="absolute right-full mr-1.5 select-none font-mono text-faint">
        {prefix}
      </span>
      {children}
    </Tag>
  )
}

const streamdownComponents: ComponentProps<typeof Streamdown>["components"] = {
  h1: (props) => <Heading level={1} {...props} />,
  h2: (props) => <Heading level={2} {...props} />,
  h3: (props) => <Heading level={3} {...props} />,
  h4: (props) => <Heading level={4} {...props} />,
  h5: (props) => <Heading level={5} {...props} />,
  h6: (props) => <Heading level={6} {...props} />,
  p: (props) => (
    <p className="my-4 leading-relaxed first:mt-0 last:mb-0" {...props} />
  ),
  a: (props) => (
    <a
      className="text-highlight-blue underline-offset-2 hover:underline"
      rel="noopener noreferrer"
      target="_blank"
      {...props}
    />
  ),
  strong: (props) => <strong className="font-semibold" {...props} />,
  em: (props) => <em className="italic" {...props} />,
  ul: (props) => <ul className="my-4 list-disc space-y-1 pl-4" {...props} />,
  ol: (props) => <ol className="my-4 list-decimal space-y-1 pl-6" {...props} />,
  li: (props) => <li {...props} />,
  blockquote: (props) => (
    <blockquote
      className="my-4 border-faint border-l-2 pl-3 text-muted italic"
      {...props}
    />
  ),
  hr: () => <hr className="my-4 border-border-solid" />,
  code: (props) => (
    <code
      className="bg-dim/10 px-1 py-0.5 font-mono text-[0.9em] text-highlight-yellow"
      {...props}
    />
  ),
  pre: (props) => {
    // biome-ignore lint/suspicious/noExplicitAny: .
    const childProps = (props.children as any).props as {
      className: string
      children: string
    }
    return (
      <pre
        className="my-4 overflow-x-auto bg-dim/5 p-3 text-sm"
        data-language={childProps}
      >
        <code>{childProps.children}</code>
      </pre>
    )
  },
  table: (props) => (
    <div className="my-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  thead: (props) => (
    <thead className="border-border-solid border-b" {...props} />
  ),
  tbody: (props) => <tbody {...props} />,
  tr: (props) => (
    <tr className="border-border-solid border-b last:border-0" {...props} />
  ),
  th: (props) => (
    <th className="px-3 py-2 text-left font-medium text-dim" {...props} />
  ),
  td: (props) => <td className="px-3 py-2 text-muted" {...props} />,
}

function formatToolInput(input: unknown): string {
  if (!input || typeof input !== "object") {
    return input ? `("${String(input)}")` : ""
  }
  const obj = input as Record<string, unknown>
  const entries = Object.entries(obj).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  )
  if (entries.length === 0) {
    return ""
  }
  const formatted = entries
    .slice(0, 3)
    .map(([k, v]) => {
      const value = typeof v === "string" ? v : JSON.stringify(v)
      return `${k}: "${value}"`
    })
    .join(", ")
  return `(${formatted})`
}

function Tool({
  id,
  name,
  summary,
  detail,
}: {
  id: string
  name: string
  summary: ReactNode
  detail: ReactNode
}) {
  const storageKey = `tool-expanded-${id}`
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(storageKey)
    if (stored === "true") {
      setExpanded(true)
    }
  }, [storageKey])

  function toggle() {
    const next = !expanded
    setExpanded(next)
    localStorage.setItem(storageKey, String(next))
  }

  return (
    <div className="my-4">
      <button
        className="flex items-start gap-2 text-left"
        onClick={toggle}
        type="button"
      >
        <span
          className={`border px-1.5 py-0.5 font-medium text-xs uppercase ${
            expanded
              ? "border-highlight-blue bg-highlight-blue text-white"
              : "border-highlight-blue/30 bg-highlight-blue/10 text-highlight-blue"
          }`}
        >
          {name}
        </span>
        <span className="font-mono text-muted text-sm">{summary}</span>
      </button>
      {expanded && (
        <div className="mt-2 ml-0 border-highlight-blue/20 border-l-2 pl-3">
          {detail}
        </div>
      )}
    </div>
  )
}

type CommentContentProps = {
  content: AgentUIMessage[]
  isStreaming?: boolean
  isRetrying?: boolean
  onRetry?: () => void
}

export function CommentContent({
  content,
  isStreaming = false,
  isRetrying = false,
  onRetry,
}: CommentContentProps) {
  return (
    <div>
      {content.map((msg) => (
        <Fragment key={msg.id}>
          {msg.parts.map((part, idx) => {
            switch (part.type) {
              case "text": {
                const hasError: boolean =
                  msg.metadata?.errorCode === ERROR_CODES.STREAM_STEP_ERROR
                return (
                  <div data-from={msg.role} key={`${msg.id}-${idx}`}>
                    <div data-error={hasError || undefined}>
                      <div>
                        <Streamdown
                          components={streamdownComponents}
                          mode={isStreaming ? "streaming" : "static"}
                          shikiTheme={["github-light", "github-dark"]}
                        >
                          {part.text}
                        </Streamdown>
                      </div>
                    </div>
                    {msg.role === "assistant" && hasError && onRetry && (
                      <div data-actions>
                        <button
                          aria-label="Retry"
                          className="flex items-center gap-1 bg-highlight-yellow px-1.5 py-0.5 font-medium text-bright text-sm disabled:opacity-50"
                          disabled={isRetrying}
                          onClick={onRetry}
                          type="button"
                        >
                          {isRetrying ? "Retrying..." : "Retry"}
                        </button>
                      </div>
                    )}
                  </div>
                )
              }
              case "reasoning":
                return (
                  <Collapsible.Root
                    key={`${msg.id}-${idx}`}
                    open={Boolean(
                      isStreaming &&
                        idx === msg.parts.length - 1 &&
                        msg.id === content.at(-1)?.id
                        ? ""
                        : undefined
                    )}
                  >
                    <Collapsible.Trigger>Thinking...</Collapsible.Trigger>
                    <Collapsible.Panel>{part.text}</Collapsible.Panel>
                  </Collapsible.Root>
                )
              default: {
                if (part.type.startsWith("tool-") && "state" in part) {
                  const toolPart = part as ToolUIPart
                  console.log(part)
                  const toolName = toolPart.type.slice(5)
                  return (
                    <Tool
                      detail={
                        toolPart.output ? (
                          <pre className="overflow-x-auto text-xs">
                            <code>
                              {JSON.stringify(toolPart.output, null, 2)}
                            </code>
                          </pre>
                        ) : undefined
                      }
                      id={toolPart.toolCallId}
                      key={`${msg.id}-${idx}`}
                      name={toolName}
                      summary={formatToolInput(toolPart.input)}
                    />
                  )
                }
                return null
              }
            }
          })}
        </Fragment>
      ))}
    </div>
  )
}

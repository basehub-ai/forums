"use client"

import { Collapsible } from "@base-ui/react/collapsible"
import type { ToolUIPart } from "ai"
import { type ComponentProps, useEffect, useState } from "react"
import { Streamdown } from "streamdown"
import type { AgentUIMessage } from "@/agent/types"
import { ERROR_CODES } from "@/lib/errors"
import { usePostMetadata } from "./post-metadata-context"

const LEADING_SLASH_REGEX = /^\//

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
    return input ? `(${String(input)})` : ""
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

function ToolInputDisplay({
  toolName,
  input,
  output,
  owner,
  repo,
  gitContext,
}: {
  toolName: string
  input: unknown
  output: unknown
  owner: string
  repo: string
  gitContext: { branch: string } | null
}) {
  const lowerName = toolName.toLowerCase()

  // Read tool: show full GitHub URL as link
  if (lowerName === "read" && typeof input === "object" && input !== null) {
    const obj = input as Record<string, unknown>
    const filePath = obj.file_path ?? obj.path
    if (typeof filePath === "string") {
      const ref = gitContext?.branch || "main"
      const githubUrl = `https://github.com/${owner}/${repo}/blob/${ref}/${filePath.replace(LEADING_SLASH_REGEX, "")}`

      return (
        <a
          className="hover:underline"
          href={githubUrl}
          rel="noopener noreferrer"
          target="_blank"
          title={filePath}
        >
          {filePath}
        </a>
      )
    }
  }

  // List tool: show directory path with results if done
  if (lowerName === "list" && typeof input === "object" && input !== null) {
    const obj = input as Record<string, unknown>
    const dirPath = (obj.path ?? obj.directory ?? obj.dir ?? ".") as string

    // If output exists, try to extract file/dir counts from summary
    if (output !== undefined && typeof output === "object" && output !== null) {
      const out = output as Record<string, unknown>
      let totalFiles = 0
      let totalDirs = 0

      if (typeof out.summary === "object" && out.summary !== null) {
        const summary = out.summary as Record<string, unknown>
        if (typeof summary.totalFiles === "number") {
          totalFiles = summary.totalFiles
        }
        if (typeof summary.totalDirs === "number") {
          totalDirs = summary.totalDirs
        }
      }

      if (totalFiles > 0 || totalDirs > 0) {
        const parts: string[] = []
        if (totalFiles > 0) {
          parts.push(`${totalFiles} ${totalFiles === 1 ? "file" : "files"}`)
        }
        if (totalDirs > 0) {
          parts.push(`${totalDirs} ${totalDirs === 1 ? "dir" : "dirs"}`)
        }
        return (
          <span>
            {dirPath} → {parts.join(", ")}
          </span>
        )
      }
    }
    return <span>{dirPath}</span>
  }

  // Grep tool: show pattern in quotes, with results if done
  if (lowerName === "grep" && typeof input === "object" && input !== null) {
    const obj = input as Record<string, unknown>
    if (typeof obj.pattern === "string") {
      // If output exists, try to extract match/file counts
      if (
        output !== undefined &&
        typeof output === "object" &&
        output !== null
      ) {
        const out = output as Record<string, unknown>
        let files = 0
        let matches = 0

        // Check for summary object (common structure)
        if (typeof out.summary === "object" && out.summary !== null) {
          const summary = out.summary as Record<string, unknown>
          if (typeof summary.fileCount === "number") {
            files = summary.fileCount
          }
          if (typeof summary.matchCount === "number") {
            matches = summary.matchCount
          }
        }

        if (files > 0 || matches > 0) {
          return (
            <span>
              "{obj.pattern}" → {matches} {matches === 1 ? "match" : "matches"}{" "}
              in {files} {files === 1 ? "file" : "files"}
            </span>
          )
        }
        return <span>"{obj.pattern}" → no matches</span>
      }
      return <span>"{obj.pattern}"</span>
    }
  }

  // WebSearch tool: show objective/query
  if (
    lowerName === "websearch" &&
    typeof input === "object" &&
    input !== null
  ) {
    const obj = input as Record<string, unknown>
    const query = obj.objective ?? obj.query ?? obj.q ?? obj.search
    if (typeof query === "string") {
      return <span>"{query}"</span>
    }
  }

  // WebExtract tool: show URL(s)
  if (
    lowerName === "webextract" &&
    typeof input === "object" &&
    input !== null
  ) {
    const obj = input as Record<string, unknown>
    let url: string | undefined
    if (Array.isArray(obj.urls) && obj.urls.length > 0) {
      url = String(obj.urls[0])
    } else if (typeof obj.urls === "string") {
      url = obj.urls
    } else if (typeof obj.url === "string") {
      url = obj.url
    }
    if (url) {
      return (
        <a
          className="hover:underline"
          href={url}
          rel="noopener noreferrer"
          target="_blank"
          title={url}
        >
          {url}
        </a>
      )
    }
  }

  // Default: show raw input
  return <span>{formatToolInput(input)}</span>
}

function countToolsByName(
  tools: ToolUIPart[]
): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>()
  for (const tool of tools) {
    const name = tool.type.slice(5).toUpperCase()
    counts.set(name, (counts.get(name) || 0) + 1)
  }
  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, count]) => ({ name, count }))
}

function Tool({
  toolPart,
  owner,
  repo,
  gitContext,
}: {
  toolPart: ToolUIPart
  owner: string
  repo: string
  gitContext: { branch: string } | null
}) {
  const storageKey = `tool-expanded-${toolPart.toolCallId}`
  const [expanded, setExpanded] = useState(false)
  const name = toolPart.type.slice(5)

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
    <div className="py-1">
      <button
        className="flex items-start gap-2 text-left"
        onClick={toggle}
        type="button"
      >
        <span
          className={`border px-1.5 py-0.5 font-medium text-xs uppercase ${
            expanded
              ? "border-highlight-gray bg-highlight-gray text-background"
              : "border-highlight-gray/30 bg-highlight-gray/10 text-highlight-gray"
          }`}
        >
          {name}
        </span>
        <span className="line-clamp-1 w-full font-mono text-muted text-sm">
          <ToolInputDisplay
            gitContext={gitContext}
            input={toolPart.input}
            output={toolPart.output}
            owner={owner}
            repo={repo}
            toolName={name}
          />
        </span>
      </button>
      {expanded && toolPart.output !== undefined && (
        <div className="mt-2 ml-0 border-highlight-gray/20 border-l-2 pl-3">
          <pre className="overflow-x-auto text-xs">
            <code>{JSON.stringify(toolPart.output, null, 2)}</code>
          </pre>
        </div>
      )}
    </div>
  )
}

function ToolGroup({
  tools,
  isLastGroup,
  isStreaming,
}: {
  tools: ToolUIPart[]
  isLastGroup: boolean
  isStreaming: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const { owner, repo, gitContext } = usePostMetadata()

  const isStreamingGroup = isLastGroup && isStreaming
  const lastTool = tools.at(-1)
  const completedStates = ["output-available", "output-error", "output-denied"]
  const lastToolInProgress = !completedStates.includes(lastTool?.state ?? "")

  const completedTools =
    isStreamingGroup && lastToolInProgress ? tools.slice(0, -1) : tools
  const inProgressTool =
    isStreamingGroup && lastToolInProgress ? lastTool : null

  // Single tool without in-progress: render without collapsible
  if (completedTools.length === 1 && !inProgressTool) {
    return (
      <div className="my-4">
        <Tool
          gitContext={gitContext}
          owner={owner}
          repo={repo}
          toolPart={completedTools[0]}
        />
      </div>
    )
  }

  const counts = countToolsByName(completedTools)
  const triggerText = counts
    .map(({ name, count }) => `${count} ${name}`)
    .join(" - ")

  return (
    <div className="my-4">
      {completedTools.length > 1 && (
        <Collapsible.Root onOpenChange={setExpanded} open={expanded}>
          <Collapsible.Trigger className="flex cursor-pointer items-center gap-2 text-left">
            <span
              className={`border px-1.5 py-0.5 font-medium text-xs ${
                expanded
                  ? "border-highlight-gray bg-highlight-gray text-background"
                  : "border-highlight-gray/30 bg-highlight-gray/10 text-highlight-gray"
              }`}
            >
              {triggerText}
            </span>
          </Collapsible.Trigger>
          <Collapsible.Panel className="mt-2 border-highlight-gray/20 border-l-2 pl-3">
            {completedTools.map((toolPart) => (
              <Tool
                gitContext={gitContext}
                key={toolPart.toolCallId}
                owner={owner}
                repo={repo}
                toolPart={toolPart}
              />
            ))}
          </Collapsible.Panel>
        </Collapsible.Root>
      )}
      {completedTools.length === 1 && inProgressTool && (
        <Tool
          gitContext={gitContext}
          owner={owner}
          repo={repo}
          toolPart={completedTools[0]}
        />
      )}
      {inProgressTool && (
        <div className={completedTools.length > 1 ? "mt-2" : ""}>
          <Tool
            gitContext={gitContext}
            owner={owner}
            repo={repo}
            toolPart={inProgressTool}
          />
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

type GroupedPart =
  | {
      type: "text"
      part: { type: "text"; text: string }
      msgId: string
      idx: number
      hasError: boolean
      msg: AgentUIMessage
    }
  | {
      type: "reasoning"
      part: { type: "reasoning"; text: string }
      msgId: string
      idx: number
      isLast: boolean
    }
  | { type: "tool-group"; tools: ToolUIPart[]; msgId: string; startIdx: number }

function groupParts(content: AgentUIMessage[]): GroupedPart[] {
  const result: GroupedPart[] = []
  let currentToolGroup: ToolUIPart[] | null = null
  let toolGroupMsgId = ""
  let toolGroupStartIdx = 0

  for (const msg of content) {
    for (let idx = 0; idx < msg.parts.length; idx++) {
      const part = msg.parts[idx]

      if (part.type.startsWith("tool-") && "state" in part) {
        const toolPart = part as ToolUIPart
        if (!currentToolGroup) {
          currentToolGroup = []
          toolGroupMsgId = msg.id
          toolGroupStartIdx = idx
        }
        currentToolGroup.push(toolPart)
      } else if (part.type === "text") {
        if (currentToolGroup) {
          result.push({
            type: "tool-group",
            tools: currentToolGroup,
            msgId: toolGroupMsgId,
            startIdx: toolGroupStartIdx,
          })
          currentToolGroup = null
        }
        result.push({
          type: "text",
          part,
          msgId: msg.id,
          idx,
          hasError: msg.metadata?.errorCode === ERROR_CODES.STREAM_STEP_ERROR,
          msg,
        })
      } else if (part.type === "reasoning") {
        if (currentToolGroup) {
          result.push({
            type: "tool-group",
            tools: currentToolGroup,
            msgId: toolGroupMsgId,
            startIdx: toolGroupStartIdx,
          })
          currentToolGroup = null
        }
        const isLast =
          idx === msg.parts.length - 1 && msg.id === content.at(-1)?.id
        result.push({ type: "reasoning", part, msgId: msg.id, idx, isLast })
      }
      // Other part types (step-start, step-finish, etc.) are ignored and don't break tool grouping
    }
  }

  if (currentToolGroup) {
    result.push({
      type: "tool-group",
      tools: currentToolGroup,
      msgId: toolGroupMsgId,
      startIdx: toolGroupStartIdx,
    })
  }

  return result
}

export function CommentContent({
  content,
  isStreaming = false,
  isRetrying = false,
  onRetry,
}: CommentContentProps) {
  const grouped = groupParts(content)

  return (
    <div>
      {grouped.map((item, groupIdx) => {
        switch (item.type) {
          case "text":
            return (
              <div data-from={item.msg.role} key={`${item.msgId}-${item.idx}`}>
                <div data-error={item.hasError || undefined}>
                  <div>
                    <Streamdown
                      components={streamdownComponents}
                      mode={isStreaming ? "streaming" : "static"}
                      shikiTheme={["github-light", "github-dark"]}
                    >
                      {item.part.text}
                    </Streamdown>
                  </div>
                </div>
                {item.msg.role === "assistant" && item.hasError && onRetry && (
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
          case "reasoning":
            return (
              <Collapsible.Root
                key={`${item.msgId}-${item.idx}`}
                open={Boolean(isStreaming && item.isLast ? "" : undefined)}
              >
                <Collapsible.Trigger>Thinking...</Collapsible.Trigger>
                <Collapsible.Panel>{item.part.text}</Collapsible.Panel>
              </Collapsible.Root>
            )
          case "tool-group":
            return (
              <ToolGroup
                isLastGroup={groupIdx === grouped.length - 1}
                isStreaming={isStreaming}
                key={`${item.msgId}-tools-${item.startIdx}`}
                tools={item.tools}
              />
            )
          default:
            return null
        }
      })}
    </div>
  )
}

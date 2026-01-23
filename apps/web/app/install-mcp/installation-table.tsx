"use client"

import { CheckIcon, ChevronRightIcon, CopyIcon } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { Streamdown } from "streamdown"
import { Button } from "@/components/button"
import { List, ListItem, TableColumnTitle } from "@/components/typography"
import { Collapsible } from "@/components/ui/collapsible"
import { Tooltip } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const MCP_URL = "https://forums.basehub.com/mcp"

const clientIds = [
  "claude-code",
  "opencode",
  "cursor",
  "codex",
  "amp",
  "gemini-cli",
  "vscode",
  "zed",
] as const

type ClientId = (typeof clientIds)[number]

const clients: { id: ClientId; label: string }[] = [
  { id: "claude-code", label: "Claude Code" },
  { id: "opencode", label: "OpenCode" },
  { id: "cursor", label: "Cursor" },
  { id: "codex", label: "Codex" },
  { id: "amp", label: "Amp" },
  { id: "gemini-cli", label: "Gemini CLI" },
  { id: "vscode", label: "VS Code" },
  { id: "zed", label: "Zed" },
]

const configs: Record<
  ClientId,
  { json?: string; command?: string; toml?: string; steps: string }
> = {
  opencode: {
    json: JSON.stringify(
      {
        $schema: "https://opencode.ai/config.json",
        mcp: {
          forums: {
            type: "remote",
            url: MCP_URL,
            oauth: {},
          },
        },
      },
      null,
      2
    ),
    command: "opencode mcp auth forums",
    steps:
      "1. Edit `~/.config/opencode/opencode.json` and add the remote MCP server configuration:",
  },
  "claude-code": {
    command: `claude mcp add --transport http forums ${MCP_URL}`,
    steps: "Run this command in your terminal:",
  },
  cursor: {
    json: JSON.stringify(
      {
        mcpServers: {
          forums: {
            url: MCP_URL,
          },
        },
      },
      null,
      2
    ),
    steps: `Or manually:

1. \`⌘ + Shift + J\` to open Cursor Settings
2. Select **Skills and Integrations**
3. Select **New MCP Server**
4. Add the configuration below`,
  },
  codex: {
    command: `codex mcp add forums -- npx -y mcp-remote@latest ${MCP_URL}`,
    toml: `[mcp_servers.forums]
command = "npx"
args = ["-y", "mcp-remote@latest", "${MCP_URL}"]`,
    steps: "Run this command in your terminal:",
  },
  amp: {
    command: `amp mcp add forums ${MCP_URL}`,
    steps: "Run this command in your terminal:",
  },
  vscode: {
    steps: `Or manually:

1. \`⌘ + P\` and search for **MCP: Add Server**
2. Select **HTTP** (HTTP or Server-Sent Events)
3. Enter \`${MCP_URL}\` and hit enter
4. Enter the name **Forums** and hit enter
5. Allow the authentication flow to complete
6. Activate the server using **MCP: List Servers**, selecting **Forums**, then **Start Server**`,
  },
  "gemini-cli": {
    json: JSON.stringify(
      {
        mcpServers: {
          forums: {
            url: MCP_URL,
          },
        },
      },
      null,
      2
    ),
    command: "/mcp auth forums",
    steps:
      "1. Edit `~/.gemini/settings.json` and add the HTTP MCP server configuration:",
  },
  zed: {
    json: JSON.stringify(
      {
        context_servers: {
          forums: {
            command: "npx",
            args: ["-y", "mcp-remote@latest", MCP_URL],
          },
          settings: {},
        },
      },
      null,
      2
    ),
    steps: `1. \`⌘ + ,\` to open Zed settings
2. Add the configuration below to your settings:`,
  },
}

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

function CodeBlock({ code, language }: { code: string; language: string }) {
  return (
    <div className="relative">
      <CopyButton text={code} />
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

function ClientContent({ clientId }: { clientId: ClientId }) {
  const config = configs[clientId]

  return (
    <div className="flex flex-col gap-4">
      <Streamdown
        components={{
          p: (props) => <p className="text-muted leading-relaxed" {...props} />,
          strong: (props) => (
            <strong className="font-semibold text-dim" {...props} />
          ),
          code: (props) => (
            <code
              className="bg-dim/5 px-1 py-0.5 font-mono text-[0.9em] text-highlight-yellow"
              {...props}
            />
          ),
          ol: (props) => (
            <ol className="list-decimal space-y-1 pl-6 text-muted" {...props} />
          ),
          li: (props) => <li {...props} />,
        }}
        mode="static"
      >
        {config.steps}
      </Streamdown>

      {config.json && <CodeBlock code={config.json} language="json" />}

      {clientId === "opencode" && (
        <Streamdown
          components={{
            p: (props) => (
              <p className="text-muted leading-relaxed" {...props} />
            ),
          }}
          mode="static"
        >
          2. Save the file and restart OpenCode. Authenticate by running:
        </Streamdown>
      )}

      {clientId === "gemini-cli" && (
        <Streamdown
          components={{
            p: (props) => (
              <p className="text-muted leading-relaxed" {...props} />
            ),
          }}
          mode="static"
        >
          2. Save the file and restart Gemini CLI. Authenticate by running:
        </Streamdown>
      )}

      {config.command && <CodeBlock code={config.command} language="bash" />}

      {clientId === "codex" && (
        <>
          <Streamdown
            components={{
              p: (props) => (
                <p className="text-muted leading-relaxed" {...props} />
              ),
              code: (props) => (
                <code
                  className="bg-dim/5 px-1 py-0.5 font-mono text-[0.9em] text-highlight-yellow"
                  {...props}
                />
              ),
            }}
            mode="static"
          >
            Or edit `~/.codex/config.toml` and add:
          </Streamdown>
          {config.toml && <CodeBlock code={config.toml} language="toml" />}
        </>
      )}
    </div>
  )
}

export function InstallationTable() {
  const [openClient, setOpenClient] = useState<ClientId | null>(null)

  return (
    <div className="mt-6">
      <div className="relative mb-2">
        <hr className="divider-md absolute top-1/2 left-0 w-full -translate-y-1/2 border-0" />
        <TableColumnTitle className="relative z-10 flex w-fit items-center gap-1.5 px-0 pr-2">
          Installation
        </TableColumnTitle>
      </div>

      <List>
        {clients.map((client) => (
          <ListItem key={client.id}>
            <Collapsible.Root
              className="w-full"
              onOpenChange={(open) => setOpenClient(open ? client.id : null)}
              open={openClient === client.id}
            >
              <Collapsible.Trigger className="group flex w-full cursor-pointer items-center gap-1 text-dim hover:text-bright">
                <ChevronRightIcon
                  absoluteStrokeWidth
                  className={cn(
                    "h-4 w-4 shrink-0 text-faint",
                    openClient === client.id && "rotate-90"
                  )}
                />
                <span>{client.label}</span>
              </Collapsible.Trigger>
              <Collapsible.Panel className="mt-4 ml-5">
                {client.id === "cursor" && (
                  <Link
                    className="mb-4 block"
                    href="https://cursor.com/en-US/install-mcp?name=forums&config=eyJ1cmwiOiJodHRwczovL2ZvcnVtcy5iYXNlaHViLmNvbS9tY3AifQ%3D%3D"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <Button>Add to Cursor</Button>
                  </Link>
                )}
                {client.id === "vscode" && (
                  <Link
                    className="mb-4 block"
                    href="https://vscode.dev/redirect/mcp/install?name=Forums&config=%7B%22type%22%3A%22http%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fforums.basehub.com%2Fmcp%22%7D"
                  >
                    <Button>Add to VS Code</Button>
                  </Link>
                )}
                <ClientContent clientId={client.id} />
              </Collapsible.Panel>
            </Collapsible.Root>
          </ListItem>
        ))}
      </List>
    </div>
  )
}

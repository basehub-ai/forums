import Link from "next/link"
import { Button } from "@/components/button"
import { CodeBlockSyntaxHighlighted } from "@/components/code-block-syntax-highlighted"
import { Instructions } from "./client-instructions"
import { CollapsibleItem } from "./collapsible-item"
import { getSiteOrigin } from "@/lib/utils"

const MCP_URL = getSiteOrigin() + "/mcp"

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

function ClientContent({ clientId }: { clientId: ClientId }) {
  const config = configs[clientId]

  return (
    <div className="flex flex-col gap-2">
      <Instructions>{config.steps}</Instructions>

      {config.json && (
        <CodeBlockSyntaxHighlighted code={config.json} language="json" />
      )}

      {clientId === "opencode" && (
        <Instructions>
          2. Save the file and restart OpenCode. Authenticate by running:
        </Instructions>
      )}

      {clientId === "gemini-cli" && (
        <Instructions>
          2. Save the file and restart Gemini CLI. Authenticate by running:
        </Instructions>
      )}

      {config.command && (
        <CodeBlockSyntaxHighlighted code={config.command} language="bash" />
      )}

      {clientId === "codex" && (
        <>
          <Instructions>Or edit `~/.codex/config.toml` and add:</Instructions>
          {config.toml && (
            <CodeBlockSyntaxHighlighted code={config.toml} language="toml" />
          )}
        </>
      )}
    </div>
  )
}

export function InstallationTable() {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
      {clients.map((client) => (
        <CollapsibleItem key={client.id} label={client.label}>
          {client.id === "cursor" && (
            <Link
              className="mb-2 block"
              href="https://cursor.com/en-US/install-mcp?name=forums&config=eyJ1cmwiOiJodHRwczovL2ZvcnVtcy5iYXNlaHViLmNvbS9tY3AifQ%3D%3D"
              rel="noopener noreferrer"
              target="_blank"
            >
              <Button>Add to Cursor</Button>
            </Link>
          )}
          {client.id === "vscode" && (
            <Link
              className="mb-2 block"
              href="https://vscode.dev/redirect/mcp/install?name=Forums&config=%7B%22type%22%3A%22http%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fforums.basehub.com%2Fmcp%22%7D"
            >
              <Button>Add to VS Code</Button>
            </Link>
          )}
          <ClientContent clientId={client.id} />
        </CollapsibleItem>
      ))}
    </div>
  )
}

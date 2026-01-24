Claude Code

1. Open your terminal to access the CLI.
2. ```
claude mcp add --transport http forums https://forums.basehub.com/mcp
```
 3. This will trigger an OAuth authentication flow to connect Claude Code to your Forums account.
4. You may need to manually authenticate if it doesnt happen automatically, which can be done via /mcp.

For more details, see the [Claude Code MCP documentation](https://code.claude.com/docs/en/mcp).

Cursor

Add to Cursor button with this link: https://cursor.com/en-US/install-mcp?name=forums&config=eyJ1cmwiOiJodHRwczovL2ZvcnVtcy5iYXNlaHViLmNvbS9tY3AifQ%3D%3D

1. Or manually: ⌘ + Shift + J to open Cursor Settings.
2. Select Skills and Integrations.
3. Select New MCP Server.
4. ```{
  "mcpServers": {
    "forums": {
      "url": "https://forums.basehub.com/mcp"
    }
  }
}```

VSCode

Add to VSCode button with this link: https://vscode.dev/redirect/mcp/install?name=Forums&config=%7B%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fforums.basehub.com%2Fmcp%22%7D

If this doesn't work, you can manually add the server using the following steps:

1. ⌘ + P and search for MCP: Add Server.
2. Select HTTP (HTTP or Server-Sent Events).
3. Enter the following configuration, and hit enter https://forums.basehub.com/mcp
4. Enter the name Forums and hit enter.
5. Allow the authentication flow to complete.
6. Activate the server using MCP: List Servers and selecting Forums, and selecting Start Server.

Codex

1. Open your terminal to access the CLI.
2. ```codex mcp add forums -- npx -y mcp-remote@latest https://forums.basehub.com/mcp```
3. Next time you run codex, the Forums MCP server will be available. It will automatically open the OAuth flow to connect to your Forums account.

Or

1. Edit ~/.codex/config.toml and add the remote MCP configuration:
```[mcp_servers.forums]
command = "npx"
args = ["-y", "mcp-remote@latest", "https://forums.basehub.com/mcp"]```
2. Save the file and restart any running codex session
3. Next time you run codex, the Forums MCP server will be available. It will automatically open the OAuth flow to connect to your Forums account.

Amp

1. Open your terminal and use the Amp CLI to add the Forums MCP server:
```amp mcp add forums https://forums.basehub.com/mcp```
2. Amp will automatically initiate OAuth authentication using Dynamic Client Registration (DCR). Follow the browser prompts to authorize the connection.
3. Once authenticated, the Forums MCP server will be available in Amp.

For more details, see the [Amp MCP documentation](https://ampcode.com/manual#mcp).

Gemini CLI

1. Edit ~/.gemini/settings.json and add the HTTP MCP server configuration:
```{
  "mcpServers": {
    "forums": {
      "url": "https://forums.basehub.com/mcp"
    }
  }
}```
2. Save the file and restart Gemini CLI.
3. Authenticate with Forums by running:
```/mcp auth forums```
4. This will open a browser window to complete the OAuth flow and connect Gemini CLI to your Forums account.

For more details, see the [Gemini CLI MCP documentation](https://github.com/google-gemini/gemini-cli).

OpenCode
1. Edit ~/.config/opencode/opencode.json and add the remote MCP server configuration:
```{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "forums": {
      "type": "remote",
      "url": "https://forums.basehub.com/mcp",
      "oauth": {}
    }
  }
}```
2. Save the file and restart OpenCode.
3. Authenticate with Forums by running:
```opencode mcp auth forums```
4. This will open a browser window to complete the OAuth flow and connect OpenCode to your Forums account.

For more details, see the [OpenCode MCP documentation](https://opencode.ai/docs/mcp-servers).

Zed

1. ⌘ + , to open Zed settings.
2. ```{
  "context_servers": {
    "forums": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote@latest",
        "https://forums.basehub.com/mcp"
      ]
    },
    "settings": {}
  }
}```
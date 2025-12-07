import { type ToolSet, tool } from "ai"
import { join } from "path"
import { z } from "zod"
import type { Workspace } from "../workspace"

export type ToolContext = {
  workspace: Workspace
}

export function getTools(context: ToolContext): ToolSet {
  return {
    Read: tool({
      name: "Read",
      description: "Reads a file and returns its contents.",
      inputSchema: z.object({ path: z.string() }),
      outputSchema: z.object({ content: z.string() }),
      execute: async ({ path }) => {
        const result = await context.workspace.sandbox.runCommand("cat", [
          join(context.workspace.path, path),
        ])
        const [out, err] = await Promise.all([result.stdout(), result.stderr()])

        if (err) {
          console.error(`[Read Tool] Error: ${err}`)
        }

        return { content: out }
      },
    }),
  }
}

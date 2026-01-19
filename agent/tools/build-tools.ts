import { type ToolSet, tool } from "ai"
import { join, resolve } from "path"
import { z } from "zod"
import type { Workspace } from "../workspace"

export type BuildToolContext = {
  workspace: Workspace
  userAccessToken: string
}

const normalizationRegex = /^\//
const exitCodeMatchRegex = /___EXIT_CODE___(\d+)\s*$/
const exitCodeReplaceRegex = /___EXIT_CODE___\d+\s*$/

function normalizePath(inputPath: string, workspacePath: string): string {
  // Resolve the absolute path
  const absolutePath = inputPath.startsWith("/")
    ? inputPath
    : join(workspacePath, inputPath)

  const resolvedPath = resolve(absolutePath)
  const resolvedWorkspace = resolve(workspacePath)

  // Ensure the resolved path is within the workspace
  // pathA starts with pathB and either pathA === pathB or the next char is /
  if (
    resolvedPath === resolvedWorkspace ||
    (resolvedPath.startsWith(resolvedWorkspace + "/") && resolvedPath.length > resolvedWorkspace.length)
  ) {
    // Return relative path from workspace
    if (resolvedPath === resolvedWorkspace) {
      return "."
    }
    return resolvedPath.slice(resolvedWorkspace.length + 1)
  }

  // Path escapes workspace - this is a security violation
  throw new Error(
    `Path traversal detected: "${inputPath}" resolves outside workspace directory`
  )
}

export function getBuildTools(context: BuildToolContext) {
  return {
    Write: tool({
      description:
        "Write content to a file, creating parent directories if needed. Overwrites existing files. Use this to create new files or replace entire file contents.",
      inputSchema: z.object({
        path: z
          .string()
          .describe("Path to the file relative to workspace root"),
        content: z.string().describe("The content to write to the file"),
      }),
      outputSchema: z.object({
        success: z.boolean(),
        path: z.string().describe("Path that was written to"),
        bytesWritten: z.number().describe("Number of bytes written"),
        error: z.string().optional().describe("Error message if failed"),
      }),
      execute: async ({ path, content }) => {
        let normalizedPath: string
        try {
          normalizedPath = normalizePath(path, context.workspace.path)
        } catch (error) {
          return {
            success: false,
            path: path,
            bytesWritten: 0,
            error: error instanceof Error ? error.message : "Invalid path",
          }
        }

        const fullPath = join(context.workspace.path, normalizedPath)

        const contentBase64 = Buffer.from(content).toString("base64")

        const result = await context.workspace.sandbox.runCommand("bash", [
          "-c",
          `
            set -e
            FILE_PATH="$1"
            CONTENT_B64="$2"

            # Create parent directories
            mkdir -p "$(dirname "$FILE_PATH")"

            # Decode and write content
            echo "$CONTENT_B64" | base64 -d > "$FILE_PATH"

            # Output bytes written
            wc -c < "$FILE_PATH" | tr -d ' '
          `,
          "--",
          fullPath,
          contentBase64,
        ])

        const [stdout, stderr] = await Promise.all([
          result.stdout(),
          result.stderr(),
        ])

        if (stderr) {
          return {
            success: false,
            path: normalizedPath,
            bytesWritten: 0,
            error: stderr,
          }
        }

        return {
          success: true,
          path: normalizedPath,
          bytesWritten: Number.parseInt(stdout.trim(), 10) || content.length,
        }
      },
    }),

    Edit: tool({
      description:
        "Replace exact text in a file. The old_string must match exactly (including whitespace and indentation). Use this for targeted edits to existing files.",
      inputSchema: z.object({
        path: z
          .string()
          .describe("Path to the file relative to workspace root"),
        old_string: z.string().describe("The exact text to find and replace"),
        new_string: z.string().describe("The text to replace it with"),
      }),
      outputSchema: z.object({
        success: z.boolean(),
        path: z.string().describe("Path that was edited"),
        replacements: z
          .number()
          .describe("Number of replacements made (should be 1)"),
        error: z.string().optional().describe("Error message if failed"),
      }),
      execute: async ({ path, old_string, new_string }) => {
        let normalizedPath: string
        try {
          normalizedPath = normalizePath(path, context.workspace.path)
        } catch (error) {
          return {
            success: false,
            path: path,
            replacements: 0,
            error: error instanceof Error ? error.message : "Invalid path",
          }
        }

        const fullPath = join(context.workspace.path, normalizedPath)

        const result = await context.workspace.sandbox.runCommand("node", [
          "-e",
          `
            const fs = require('fs');
            const path = process.argv[1];
            const oldStr = process.argv[2];
            const newStr = process.argv[3];

            try {
              const content = fs.readFileSync(path, 'utf8');
              const count = content.split(oldStr).length - 1;

              if (count === 0) {
                console.log(JSON.stringify({ error: 'old_string not found in file', count: 0 }));
                process.exit(0);
              }

              if (count > 1) {
                console.log(JSON.stringify({ error: 'old_string is not unique (' + count + ' occurrences)', count }));
                process.exit(0);
              }

              const newContent = content.replace(oldStr, newStr);
              fs.writeFileSync(path, newContent, 'utf8');
              console.log(JSON.stringify({ count: 1 }));
            } catch (e) {
              console.log(JSON.stringify({ error: e.message, count: 0 }));
            }
          `,
          fullPath,
          old_string,
          new_string,
        ])

        const [stdout, stderr] = await Promise.all([
          result.stdout(),
          result.stderr(),
        ])

        if (stderr) {
          return {
            success: false,
            path: normalizedPath,
            replacements: 0,
            error: stderr,
          }
        }

        try {
          const parsed = JSON.parse(stdout.trim()) as {
            error?: string
            count: number
          }

          if (parsed.error) {
            return {
              success: false,
              path: normalizedPath,
              replacements: parsed.count,
              error: parsed.error,
            }
          }

          return {
            success: true,
            path: normalizedPath,
            replacements: parsed.count,
          }
        } catch {
          return {
            success: false,
            path: normalizedPath,
            replacements: 0,
            error: `Failed to parse output: ${stdout}`,
          }
        }
      },
    }),

    Bash: tool({
      description:
        "Execute a shell command in the workspace. GitHub CLI is pre-authenticated. Use this for git operations, running tests, installing dependencies, and other shell tasks.",
      inputSchema: z.object({
        command: z.string().describe("The shell command to execute"),
        workdir: z
          .string()
          .optional()
          .describe(
            "Working directory relative to workspace root (defaults to workspace root)"
          ),
      }),
      outputSchema: z.object({
        stdout: z.string().describe("Standard output from the command"),
        stderr: z.string().describe("Standard error from the command"),
        exitCode: z.number().describe("Exit code of the command"),
      }),
      execute: async ({ command, workdir }) => {
        let cwd = context.workspace.path

        if (workdir) {
          try {
            const normalizedWorkdir = normalizePath(workdir, context.workspace.path)
            cwd = join(context.workspace.path, normalizedWorkdir)
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Invalid path"
            return {
              stdout: "",
              stderr: errorMsg,
              exitCode: 1,
            }
          }
        }

        const result = await context.workspace.sandbox.runCommand("bash", [
          "-c",
          `
            cd "$1" || exit 1
            export PATH="$HOME/.local/bin:$PATH"
            export GH_TOKEN="$2"

            # Run the command and capture exit code
            bash -c "$3"
            EXIT_CODE=$?

            # Output exit code marker
            echo "___EXIT_CODE___$EXIT_CODE"
          `,
          "--",
          cwd,
          context.userAccessToken,
          command,
        ])

        const [rawStdout, stderr] = await Promise.all([
          result.stdout(),
          result.stderr(),
        ])

        // Parse exit code from output
        // Use a non-greedy match to find the marker anywhere in the output,
        // then extract the exit code. This handles cases where output appears
        // after the marker (e.g., from background processes).
        const exitCodeMatch = rawStdout.match(/___EXIT_CODE___(\d+)/m)
        const exitCode = exitCodeMatch
          ? Number.parseInt(exitCodeMatch[1], 10)
          : 1
        const stdout = rawStdout.replace(exitCodeReplaceRegex, "")

        return {
          stdout,
          stderr,
          exitCode,
        }
      },
    }),
  } satisfies ToolSet
}

export type BuildTools = ReturnType<typeof getBuildTools>
export type BuildToolName = keyof BuildTools

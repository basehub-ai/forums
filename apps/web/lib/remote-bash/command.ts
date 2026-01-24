import type { Sandbox } from "@vercel/sandbox"
import { CommandTimeoutError, SandboxError } from "./errors"

export type CommandResult = {
  stdout: string
  stderr: string
  exitCode: number
  truncated: boolean
  executionTimeMs: number
}

// Output limits from spec
const MAX_STDOUT = 1024 * 1024 // 1 MB
const MAX_STDERR = 100 * 1024 // 100 KB

// Timeout limits from spec
export const DEFAULT_TIMEOUT = 30_000 // 30 seconds
export const MAX_TIMEOUT = 120_000 // 2 minutes

/**
 * Ensure just-bash is installed in the sandbox.
 * This is cached after first run due to sandbox reuse.
 */
async function ensureJustBashInstalled(sandbox: Sandbox): Promise<void> {
  const checkResult = await sandbox.runCommand({
    cmd: "bash",
    args: ["-c", "which just-bash || npm install -g just-bash"],
  })

  let stderr = ""
  for await (const log of checkResult.logs()) {
    if (log.stream === "stderr") {
      stderr += log.data
    }
  }

  // Ignore npm warnings, only throw on actual errors
  if (stderr.includes("npm ERR!")) {
    throw new SandboxError(`Failed to install just-bash: ${stderr}`)
  }
}

/**
 * Execute a command in the sandbox using just-bash for isolation.
 * Commands run in read-only mode by default (writes blocked).
 */
export async function executeCommand(
  sandbox: Sandbox,
  workspacePath: string,
  command: string,
  timeoutMs = DEFAULT_TIMEOUT
): Promise<CommandResult> {
  // Clamp timeout to allowed range
  const effectiveTimeout = Math.min(Math.max(timeoutMs, 1000), MAX_TIMEOUT)

  await ensureJustBashInstalled(sandbox)

  const startTime = Date.now()

  // Use just-bash with read-only mode (default)
  // The --root flag sets the working directory
  const result = await sandbox.runCommand({
    cmd: "bash",
    args: [
      "-c",
      `cd "${workspacePath}" && timeout ${Math.ceil(effectiveTimeout / 1000)} just-bash --root . -c ${escapeShellArg(command)}`,
    ],
  })

  let stdout = ""
  let stderr = ""
  let truncated = false

  for await (const log of result.logs()) {
    if (log.stream === "stdout") {
      if (stdout.length < MAX_STDOUT) {
        stdout += log.data
        if (stdout.length > MAX_STDOUT) {
          stdout = stdout.slice(0, MAX_STDOUT)
          truncated = true
        }
      }
    } else if (stderr.length < MAX_STDERR) {
      stderr += log.data
      if (stderr.length > MAX_STDERR) {
        stderr = stderr.slice(0, MAX_STDERR)
        truncated = true
      }
    }
  }

  const executionTimeMs = Date.now() - startTime

  // timeout command returns 124 on timeout
  const exitCode = result.exitCode ?? 0
  if (exitCode === 124) {
    throw new CommandTimeoutError(effectiveTimeout)
  }

  return {
    stdout,
    stderr,
    exitCode,
    truncated,
    executionTimeMs,
  }
}

/**
 * Escape a string for safe use in a shell command.
 */
function escapeShellArg(arg: string): string {
  // Use single quotes and escape any single quotes in the string
  return `'${arg.replace(/'/g, "'\\''")}'`
}

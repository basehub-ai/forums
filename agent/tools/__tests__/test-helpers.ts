import { chmodSync, mkdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { Sandbox } from "@vercel/sandbox"
import { spawn } from "bun"
import type { Workspace } from "../../workspace"

type CommandResult = {
  stdout: () => Promise<string>
  stderr: () => Promise<string>
  exitCode?: number
}

const mockBinDir = join(tmpdir(), "agentfs-mock-bin")

function ensureMockAgentfs() {
  mkdirSync(mockBinDir, { recursive: true })
  const mockScript = `#!/bin/bash
# Mock agentfs for testing
case "$1" in
  init)
    # Create fake db file so the check passes
    mkdir -p .agentfs
    touch ".agentfs/$2.db"
    ;;
  run)
    # Skip "run --session <id> --" and execute the rest
    shift # run
    shift # --session
    shift # <session-id>
    shift # --
    exec "$@"
    ;;
esac
`
  const scriptPath = join(mockBinDir, "agentfs")
  writeFileSync(scriptPath, mockScript)
  chmodSync(scriptPath, 0o755)
}

ensureMockAgentfs()

export function createRealSandbox(): Sandbox {
  return {
    runCommand: async (
      cmdOrParams: string | { cmd: string; args?: string[] },
      args?: string[]
    ): Promise<CommandResult> => {
      let cmd: string
      let cmdArgs: string[] | undefined

      if (typeof cmdOrParams === "string") {
        cmd = cmdOrParams
        cmdArgs = args
      } else {
        cmd = cmdOrParams.cmd
        cmdArgs = cmdOrParams.args
      }

      const fullArgs = cmdArgs || []

      const proc = spawn([cmd, ...fullArgs], {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, PATH: `${mockBinDir}:${process.env.PATH}` },
      })

      const [stdout, stderr] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
      ])

      const exitCode = await proc.exited

      return {
        stdout: async () => stdout,
        stderr: async () => stderr,
        exitCode,
      }
    },
  } as unknown as Sandbox
}

export function createTestWorkspace(path: string): Workspace {
  return {
    path,
    sandbox: createRealSandbox(),
    gitContextData: {
      sha: "abc123def456",
      branch: "main",
      tags: [],
      message: "Test commit",
      date: "2024-01-01 00:00:00 +0000",
    },
  }
}

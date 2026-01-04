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

const mockBinDir = join(tmpdir(), "isolation-mock-bin")

function ensureMockBwrap() {
  mkdirSync(mockBinDir, { recursive: true })

  // Mock bwrap: skip all the --ro-bind, --bind, --tmpfs etc args and just run the command after --
  const mockScript = `#!/bin/bash
# Mock bwrap for testing - skip isolation args and run the command directly
while [[ $# -gt 0 ]]; do
  case "$1" in
    --)
      shift
      exec "$@"
      ;;
    --ro-bind|--bind|--tmpfs|--dev|--proc|--chdir)
      shift 2 # skip flag and its argument
      ;;
    *)
      shift
      ;;
  esac
done
`
  const scriptPath = join(mockBinDir, "bwrap")
  writeFileSync(scriptPath, mockScript)
  chmodSync(scriptPath, 0o755)

  // Mock sudo: just run the command without privilege escalation
  const sudoScript = `#!/bin/bash
exec "$@"
`
  const sudoPath = join(mockBinDir, "sudo")
  writeFileSync(sudoPath, sudoScript)
  chmodSync(sudoPath, 0o755)

  // Mock mountpoint: always return success (already mounted) so we skip the mount step in tests
  const mountpointScript = `#!/bin/bash
exit 0
`
  const mountpointPath = join(mockBinDir, "mountpoint")
  writeFileSync(mountpointPath, mountpointScript)
  chmodSync(mountpointPath, 0o755)
}

ensureMockBwrap()

export function createRealSandbox(): Sandbox {
  return {
    runCommand: async (
      cmdOrParams: string | { cmd: string; args?: string[]; sudo?: boolean },
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

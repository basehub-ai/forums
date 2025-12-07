import type { Sandbox } from "@vercel/sandbox"
import { spawn } from "bun"
import type { Workspace } from "../../workspace"

type CommandResult = {
  stdout: () => Promise<string>
  stderr: () => Promise<string>
}

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

      // Use Bun.spawn for precise argument control
      const proc = spawn([cmd, ...fullArgs], {
        stdout: "pipe",
        stderr: "pipe",
      })

      const [stdout, stderr] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
      ])

      await proc.exited

      return {
        stdout: async () => stdout,
        stderr: async () => stderr,
      }
    },
  } as unknown as Sandbox
}

export function createTestWorkspace(path: string): Workspace {
  return {
    path,
    sandbox: createRealSandbox(),
  }
}

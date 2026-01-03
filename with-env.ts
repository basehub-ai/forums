import { spawn, spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const tempDir = mkdtempSync(join(tmpdir(), "vc-env-"))
const tempFile = join(tempDir, ".env")

try {
  const start = Date.now()

  const result = spawnSync("vc", ["env", "pull", tempFile, "--yes"], {
    encoding: "utf-8",
    stdio: ["inherit", "pipe", "pipe"],
  })

  if (result.status !== 0) {
    process.stderr.write(result.stdout || "")
    process.stderr.write(result.stderr || "")
    process.exit(result.status ?? 1)
  }

  const content = readFileSync(tempFile, "utf-8")
  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) {
      continue
    }
    const eq = trimmed.indexOf("=")
    if (eq === -1) {
      continue
    }
    const key = trimmed.slice(0, eq)
    let val = trimmed.slice(eq + 1)
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    process.env[key] = val
  }

  console.log(`Downloaded env from Vercel in ${Date.now() - start}ms`)
} finally {
  rmSync(tempDir, { recursive: true, force: true })
}

const [cmd, ...args] = process.argv.slice(2)
if (!cmd) {
  console.error("Usage: bun with-env.ts <command> [args...]")
  process.exit(1)
}

const child = spawn(cmd, args, { stdio: "inherit", env: process.env })
child.on("exit", (code) => process.exit(code ?? 0))

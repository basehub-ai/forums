import { writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { detectInstalledVersion } from "@/lib/detect-version"
import type {
  RemoteBashAPIResponse,
  RemoteBashErrorResponse,
  RemoteBashRequest,
  RemoteBashResponse,
} from "@/lib/remote-bash"

const DEFAULT_TRUNCATE_TOKENS = 6000
const CHARS_PER_TOKEN = 4

type RemoteBashCLIParams = RemoteBashRequest & {
  truncate?: number // max tokens to return, default 6000. 0 = no truncation
}

type RemoteBashCLIResponse = Omit<RemoteBashResponse, "truncated"> & {
  truncated: boolean
  totalTokens: number
  returnedTokens: number
  fullOutputPath?: string // path to temp file if truncated
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

function truncateToTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * CHARS_PER_TOKEN
  if (text.length <= maxChars) return text
  return text.slice(0, maxChars)
}

async function writeToTempFile(content: string): Promise<string> {
  const filename = `remote-bash-${Date.now()}.txt`
  const filepath = join(tmpdir(), filename)
  await writeFile(filepath, content, "utf-8")
  return filepath
}

async function remoteBashCLI({
  repo,
  command,
  ref,
  version,
  timeout,
  truncate = DEFAULT_TRUNCATE_TOKENS,
}: RemoteBashCLIParams): Promise<RemoteBashCLIResponse> {
  const res = await fetch("/api/remote-bash", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      repo,
      command,
      ...(ref && { ref }),
      ...(version && { version }),
      ...(timeout && { timeout }),
    }),
  })

  const data = (await res.json()) as RemoteBashAPIResponse

  if (!res.ok || "error" in data) {
    const errorData = data as RemoteBashErrorResponse
    throw new Error(errorData.error?.message ?? "Remote bash failed")
  }

  const fullOutput = data.stdout + data.stderr
  const totalTokens = estimateTokens(fullOutput)
  const shouldTruncate = truncate > 0 && totalTokens > truncate

  let stdout = data.stdout
  let stderr = data.stderr
  let fullOutputPath: string | undefined

  if (shouldTruncate) {
    fullOutputPath = await writeToTempFile(fullOutput)

    // truncate stdout first, then stderr if needed
    const stdoutTokens = estimateTokens(stdout)
    if (stdoutTokens > truncate) {
      stdout = truncateToTokens(stdout, truncate)
      stderr = ""
    } else {
      const remainingTokens = truncate - stdoutTokens
      stderr = truncateToTokens(stderr, remainingTokens)
    }
  }

  const returnedTokens = estimateTokens(stdout + stderr)

  return {
    ...data,
    stdout,
    stderr,
    truncated: shouldTruncate,
    totalTokens,
    returnedTokens,
    ...(fullOutputPath && { fullOutputPath }),
  }
}

type ParsedArgs = {
  repo: string
  ref?: string
  version?: string
  command: string
}

export function parseArgs({ argv }: { argv: string[] }): ParsedArgs {
  const doubleDashIdx = argv.indexOf("--")

  if (doubleDashIdx === -1) {
    throw new Error("Missing -- separator before command")
  }

  const flags = argv.slice(0, doubleDashIdx)
  const commandParts = argv.slice(doubleDashIdx + 1)

  if (commandParts.length === 0) {
    throw new Error("Missing command after --")
  }

  const command = commandParts.join(" ")

  const repo = flags[0]
  if (!repo) {
    throw new Error("Missing repo")
  }

  let ref: string | undefined
  let version: string | undefined

  for (let i = 1; i < flags.length; i++) {
    const flag = flags[i]
    const next = flags[i + 1]

    if (flag === "-ref") {
      if (!next) throw new Error("Missing value for -ref")
      ref = next
      i++
    } else if (flag === "-v") {
      if (!next) throw new Error("Missing value for -v")
      version = next
      i++
    } else {
      throw new Error(`Unknown flag: ${flag}`)
    }
  }

  return { repo, ref, version, command }
}

function isPackageName(repo: string): boolean {
  // owner/repo format has a slash, package names don't (or are scoped @org/pkg)
  if (repo.includes("/") && !repo.startsWith("@")) {
    return false
  }
  return true
}

export default async function handler() {
  const argv = process.argv.slice(2)
  const args = parseArgs({ argv })

  // auto-detect version from lockfile if not specified and repo looks like a package name
  if (!args.version && isPackageName(args.repo)) {
    const detectedVersion = await detectInstalledVersion({
      packageName: args.repo,
    })
    if (detectedVersion) {
      args.version = detectedVersion
    }
  }

  const result = await remoteBashCLI(args)

  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)

  if (result.truncated) {
    console.error(
      `\n[truncated: ${result.returnedTokens}/${result.totalTokens} tokens]`
    )
    console.error(`[full output: ${result.fullOutputPath}]`)
  }

  return result
}

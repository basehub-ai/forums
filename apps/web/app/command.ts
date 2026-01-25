import { writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
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

export default async function handler({
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

import { headers } from "next/headers"
import type { InferSchema } from "xmcp"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { autumn, CREDIT_COSTS, checkIsPro } from "@/lib/autumn"
import { checkMessageRateLimit } from "@/lib/rate-limit"
import {
  DEFAULT_TIMEOUT,
  MAX_TIMEOUT,
  RemoteBashError,
  remoteBash,
} from "@/lib/remote-bash"

export const schema = {
  repo: z
    .string()
    .describe(
      "Repository URL, owner/repo, or npm package name (e.g., 'https://github.com/vercel/next.js', 'vercel/next.js', or 'next')"
    ),
  command: z.string().describe("Bash command to execute in the repository"),
  ref: z.string().optional().describe("Git ref (branch, tag, commit SHA)"),
  version: z
    .string()
    .optional()
    .describe("Package version - resolves to corresponding git tag"),
  timeout: z
    .number()
    .min(1000)
    .max(MAX_TIMEOUT)
    .optional()
    .describe(
      `Timeout in milliseconds (default: ${DEFAULT_TIMEOUT}, max: ${MAX_TIMEOUT})`
    ),
}

export const metadata = {
  name: "bash",
  description:
    "Execute bash commands against any public repository's source code. Runs in a sandboxed environment with read-only access to the repository. Use for exploring codebases, running analysis tools, checking dependencies, or any read-only operations.",
  annotations: {
    title: "Run bash in repository",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
}

export default async function bash({
  repo,
  command,
  ref,
  version,
  timeout,
}: InferSchema<typeof schema>): Promise<{
  content: { type: "text"; text: string }[]
  structuredContent: {
    success: boolean
    stdout: string
    stderr: string
    exitCode: number
    resolvedRef: string
    resolvedVersion?: string
    executionTimeMs: number
    truncated: boolean
  }
}> {
  const session = await auth.api.getMcpSession({ headers: await headers() })

  if (!session) {
    throw new Error("Authentication required. Please reconnect with OAuth.")
  }

  const userId = session.userId

  // Rate limit check
  await checkMessageRateLimit(userId)

  // Check credits
  const isPro = await checkIsPro(userId)
  const { data: checkResult, error: checkError } = await autumn.check({
    customer_id: userId,
    feature_id: "standard_credits",
    required_balance: CREDIT_COSTS.standard,
  })

  if (checkError || !checkResult) {
    throw new Error("Failed to check billing status. Please try again.")
  }

  if (!checkResult.allowed) {
    if (isPro) {
      throw new Error(
        "You've used all your Pro credits this month. Credits reset at the start of your billing cycle."
      )
    }
    throw new Error(
      "You've used all 5 daily credits. Wait until tomorrow or upgrade to Pro for 1500 monthly credits at forums.basehub.com/pricing"
    )
  }

  try {
    const result = await remoteBash({
      repo,
      command,
      ref,
      version,
      timeout,
    })

    // Format output for display
    let textOutput = ""
    if (result.stdout) {
      textOutput += result.stdout
    }
    if (result.stderr) {
      if (textOutput) {
        textOutput += "\n"
      }
      textOutput += `[stderr]\n${result.stderr}`
    }
    if (!textOutput) {
      textOutput = `Command completed with exit code ${result.exitCode}`
    }
    if (result.truncated) {
      textOutput += "\n[output truncated]"
    }

    return {
      content: [{ type: "text", text: textOutput }],
      structuredContent: result,
    }
  } catch (err) {
    if (err instanceof RemoteBashError) {
      throw new Error(`${err.code}: ${err.message}`)
    }
    throw err
  }
}

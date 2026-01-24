import { headers } from "next/headers"
import { z } from "zod"
import { checkRemoteBashRateLimit } from "@/lib/rate-limit"
import {
  DEFAULT_TIMEOUT,
  MAX_TIMEOUT,
  RemoteBashError,
  remoteBash,
} from "@/lib/remote-bash"

const RequestSchema = z.object({
  repo: z.string().min(1, "Repository is required"),
  command: z.string().min(1, "Command is required"),
  ref: z.string().optional(),
  version: z.string().optional(),
  timeout: z.coerce
    .number()
    .min(1000)
    .max(MAX_TIMEOUT)
    .optional()
    .default(DEFAULT_TIMEOUT),
})

function getClientIP(headersList: Awaited<ReturnType<typeof headers>>): string {
  // Try various headers in order of preference
  const forwarded = headersList.get("x-forwarded-for")
  if (forwarded) {
    // x-forwarded-for can be a comma-separated list; take the first one
    return forwarded.split(",")[0].trim()
  }

  const realIp = headersList.get("x-real-ip")
  if (realIp) {
    return realIp
  }

  // Vercel-specific header
  const vercelIp = headersList.get("x-vercel-forwarded-for")
  if (vercelIp) {
    return vercelIp.split(",")[0].trim()
  }

  // Fallback
  return "unknown"
}

async function handleRequest(
  params: z.infer<typeof RequestSchema>
): Promise<Response> {
  const headersList = await headers()

  // Rate limiting by IP
  const clientIP = getClientIP(headersList)
  const rateLimitResult = await checkRemoteBashRateLimit(clientIP)

  if (!rateLimitResult.success) {
    const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
    return Response.json(
      {
        success: false,
        error: {
          message: "Rate limit exceeded",
          code: "RATE_LIMITED",
        },
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(retryAfter, 1)),
          "Cache-Control": "no-store",
        },
      }
    )
  }

  try {
    const result = await remoteBash(params)

    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (err) {
    if (err instanceof RemoteBashError) {
      return Response.json(
        {
          success: false,
          error: {
            message: err.message,
            code: err.code,
          },
        },
        {
          status: err.statusCode,
          headers: { "Cache-Control": "no-store" },
        }
      )
    }

    console.error("Remote bash unexpected error:", err)

    return Response.json(
      {
        success: false,
        error: {
          message: "An unexpected error occurred",
          code: "INTERNAL_ERROR",
        },
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    )
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const params = {
    repo: searchParams.get("repo") ?? "",
    command: searchParams.get("command") ?? "",
    ref: searchParams.get("ref") ?? undefined,
    version: searchParams.get("version") ?? undefined,
    timeout: searchParams.get("timeout") ?? undefined,
  }

  const parseResult = RequestSchema.safeParse(params)
  if (!parseResult.success) {
    const errors = parseResult.error.issues
      .map((e) => `${String(e.path.join("."))}: ${e.message}`)
      .join(", ")
    return Response.json(
      {
        success: false,
        error: {
          message: `Invalid request: ${errors}`,
          code: "VALIDATION_ERROR",
        },
      },
      {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      }
    )
  }

  return await handleRequest(parseResult.data)
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      {
        success: false,
        error: {
          message: "Invalid JSON in request body",
          code: "INVALID_JSON",
        },
      },
      { status: 400 }
    )
  }

  const parseResult = RequestSchema.safeParse(body)
  if (!parseResult.success) {
    const errors = parseResult.error.issues
      .map((e) => `${String(e.path.join("."))}: ${e.message}`)
      .join(", ")
    return Response.json(
      {
        success: false,
        error: {
          message: `Invalid request: ${errors}`,
          code: "VALIDATION_ERROR",
        },
      },
      { status: 400 }
    )
  }

  return handleRequest(parseResult.data)
}

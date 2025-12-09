import { type NextRequest, NextResponse } from "next/server"

const THREAD_SLUG_REGEX = /^\/([^/]+)\/([^/]+)\/.+-([^/]+)(\/.*)?$/

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Match: /owner/repo/ANY-SLUG-123/whatever -> /owner/repo/123/whatever
  // Captures: owner, repo, thread ID, and any remaining path segments
  const match = pathname.match(THREAD_SLUG_REGEX)

  if (match) {
    const [, owner, repo, threadId, restPath] = match
    const newPath = `/${owner}/${repo}/${threadId}${restPath || ""}`

    return NextResponse.rewrite(new URL(newPath, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: "/:owner/:repo/:path*",
}

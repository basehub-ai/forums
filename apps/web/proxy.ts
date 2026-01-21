import { type NextRequest, NextResponse } from "next/server"

export function proxy(request: NextRequest) {
  const accept = request.headers.get("accept") ?? ""

  if (accept.includes("text/markdown")) {
    const url = request.nextUrl.clone()
    url.pathname = `${url.pathname}/llms.txt`
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: "/:owner/:repo/:postNumber(\\d+)",
}

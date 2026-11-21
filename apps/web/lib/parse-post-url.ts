import { parsePostSegment } from "./post-url"

const TRAILING_SLASH_REGEX = /\/$/

export function parsePostUrl(url: string): {
  owner: string
  repo: string
  postNumber: number
} | null {
  try {
    // Extract pathname - handle both full URLs and paths
    let pathname: string
    if (url.startsWith("http://") || url.startsWith("https://")) {
      pathname = new URL(url).pathname
    } else if (url.startsWith("/")) {
      pathname = url
    } else {
      pathname = `/${url}`
    }

    // Remove trailing slash if present
    pathname = pathname.replace(TRAILING_SLASH_REGEX, "")

    // Split and validate: expect exactly /owner/repo/postNumber
    const parts = pathname.split("/").filter(Boolean)
    if (parts.length !== 3) {
      return null
    }

    const [owner, repo, postNumberStr] = parts

    const postNumber = parsePostSegment(postNumberStr)
    if (postNumber === null) {
      return null
    }

    return { owner, repo, postNumber }
  } catch {
    return null
  }
}

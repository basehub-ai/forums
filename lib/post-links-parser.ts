import type { AgentUIMessage } from "@/agent/types"

export type ParsedPostLink = {
  owner: string | null
  repo: string | null
  number: number
  raw: string
}

export function extractPostLinks(content: AgentUIMessage): ParsedPostLink[] {
  const links: ParsedPostLink[] = []
  for (const part of content.parts) {
    if (part.type === "text") {
      // Pattern 1: owner/repo#number or #number
      const hashMatches = part.text.matchAll(
        /(?:([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+))?#(\d+)/g
      )
      for (const match of hashMatches) {
        links.push({
          owner: match[1] ?? null,
          repo: match[2] ?? null,
          number: Number.parseInt(match[3], 10),
          raw: match[0],
        })
      }

      // Pattern 2: owner/repo/number (with optional leading slash)
      // Matches: /owner/repo/123, owner/repo/123, domain.com/owner/repo/123
      const urlMatches = part.text.matchAll(
        /(?<![a-zA-Z0-9])\/?([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)\/(\d+)(?![/\d])/g
      )
      for (const match of urlMatches) {
        links.push({
          owner: match[1],
          repo: match[2],
          number: Number.parseInt(match[3], 10),
          raw: match[0],
        })
      }
    }
  }
  return links
}

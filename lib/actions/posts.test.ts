import { describe, expect, test } from "bun:test"
import { parsePostUrl } from "../parse-post-url"

describe("parsePostUrl", () => {
  test("parses full URL with https", () => {
    const result = parsePostUrl("https://example.com/owner/repo/123")
    expect(result).toEqual({ owner: "owner", repo: "repo", postNumber: 123 })
  })

  test("parses full URL with http", () => {
    const result = parsePostUrl("http://example.com/owner/repo/456")
    expect(result).toEqual({ owner: "owner", repo: "repo", postNumber: 456 })
  })

  test("parses path with leading slash", () => {
    const result = parsePostUrl("/owner/repo/123")
    expect(result).toEqual({ owner: "owner", repo: "repo", postNumber: 123 })
  })

  test("parses path without leading slash", () => {
    const result = parsePostUrl("owner/repo/123")
    expect(result).toEqual({ owner: "owner", repo: "repo", postNumber: 123 })
  })

  test("handles trailing slash", () => {
    const result = parsePostUrl("/owner/repo/123/")
    expect(result).toEqual({ owner: "owner", repo: "repo", postNumber: 123 })
  })

  test("returns null for too few parts", () => {
    expect(parsePostUrl("/owner/repo")).toBeNull()
    expect(parsePostUrl("/owner")).toBeNull()
    expect(parsePostUrl("/")).toBeNull()
    expect(parsePostUrl("")).toBeNull()
  })

  test("returns null for too many parts", () => {
    expect(parsePostUrl("/owner/repo/123/extra")).toBeNull()
  })

  test("returns null for non-numeric post number", () => {
    expect(parsePostUrl("/owner/repo/abc")).toBeNull()
    expect(parsePostUrl("/owner/repo/12.34")).toBeNull()
    expect(parsePostUrl("/owner/repo/1e5")).toBeNull()
  })

  test("returns null for negative post number", () => {
    expect(parsePostUrl("/owner/repo/-1")).toBeNull()
  })

  test("returns null for zero post number", () => {
    expect(parsePostUrl("/owner/repo/0")).toBeNull()
  })

  test("handles real-world URLs", () => {
    const result = parsePostUrl("https://forums.basehub.com/vercel/next.js/42")
    expect(result).toEqual({
      owner: "vercel",
      repo: "next.js",
      postNumber: 42,
    })
  })
})

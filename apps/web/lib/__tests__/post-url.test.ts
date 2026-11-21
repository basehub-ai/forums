import { describe, expect, test } from "bun:test"
import { parsePostUrl } from "../parse-post-url"
import { parsePostSegment, postPath, postSlug } from "../post-url"

describe("postSlug", () => {
  test("puts the slugified title before the number", () => {
    expect(
      postSlug({ number: 3, title: "How does Ghostty render fonts?" })
    ).toBe("how-does-ghostty-render-fonts-3")
  })

  test("falls back to the number without a title", () => {
    expect(postSlug({ number: 3, title: null })).toBe("3")
    expect(postSlug({ number: 3, title: "" })).toBe("3")
  })

  test("falls back to the number when the title has nothing sluggable", () => {
    expect(postSlug({ number: 3, title: "???" })).toBe("3")
  })

  test("cuts long titles at a word boundary", () => {
    const slug = postSlug({ number: 7, title: "word ".repeat(40) })
    expect(slug.length).toBeLessThanOrEqual(82)
    expect(slug.endsWith("word-7")).toBe(true)
  })

  test("round-trips through parsePostSegment", () => {
    for (const title of [
      "Fix 2 things in v1.2",
      "100% CPU on macOS 14",
      null,
    ]) {
      expect(parsePostSegment(postSlug({ number: 42, title }))).toBe(42)
    }
  })
})

describe("postPath", () => {
  test("builds the full path", () => {
    expect(
      postPath({
        owner: "ghostty-org",
        repo: "ghostty",
        number: 3,
        title: "Kitty graphics",
      })
    ).toBe("/ghostty-org/ghostty/kitty-graphics-3")
  })
})

describe("parsePostSegment", () => {
  test("accepts a bare number", () => {
    expect(parsePostSegment("3")).toBe(3)
  })

  test("accepts a slug with the number last", () => {
    expect(parsePostSegment("kitty-graphics-3")).toBe(3)
    expect(parsePostSegment("fix-2-things-15")).toBe(15)
  })

  test("rejects anything else", () => {
    for (const s of [
      "",
      "abc",
      "3-abc",
      "-3",
      "kitty--3",
      "kitty-3.md",
      "0",
      "12.5",
    ]) {
      expect(parsePostSegment(s)).toBeNull()
    }
  })
})

describe("parsePostUrl with slugs", () => {
  test("parses a slugified post URL", () => {
    expect(
      parsePostUrl(
        "https://forums.basehub.com/ghostty-org/ghostty/kitty-graphics-3"
      )
    ).toEqual({ owner: "ghostty-org", repo: "ghostty", postNumber: 3 })
  })
})

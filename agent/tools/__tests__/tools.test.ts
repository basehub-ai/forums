import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

let mockDbData: { posts: any[]; comments: any[] } = { posts: [], comments: [] }
let queryCount = 0

mock.module("@/lib/db/client", () => ({
  db: {
    select: () => {
      const currentQuery = queryCount++
      return {
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve(
                currentQuery === 0 ? mockDbData.posts.slice(0, 1) : []
              ),
            orderBy: () =>
              Promise.resolve(currentQuery === 1 ? mockDbData.comments : []),
          }),
          orderBy: () => Promise.resolve([]),
        }),
      }
    },
  },
}))

import { getTools } from "../index"
import { createTestWorkspace } from "./test-helpers"

let testDir: string

beforeEach(() => {
  testDir = mkdtempSync(join(tmpdir(), "agent-tools-test-"))
})

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true })
})

describe("Read Tool", () => {
  test("reads small file (<200 lines) fully", async () => {
    const content = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}`).join(
      "\n"
    )
    writeFileSync(join(testDir, "small.txt"), content)

    const workspace = createTestWorkspace(testDir)
    const tools = getTools({ workspace })
    const result = await tools.Read.execute?.(
      { path: "small.txt" },
      { messages: [], toolCallId: "" }
    )

    if (result && "metadata" in result) {
      expect(result?.metadata.totalLines).toBe(50)
      expect(result?.metadata.linesShown).toBe(50)
      expect(result?.metadata.startLine).toBe(1)
      expect(result?.metadata.endLine).toBe(50)
      expect(result?.metadata.isPaginated).toBe(false)
      expect(result?.content).toContain("Line 1")
      expect(result?.content).toContain("Line 50")
    }
  })

  test("paginates large file (>200 lines) automatically", async () => {
    const content = Array.from({ length: 500 }, (_, i) => `Line ${i + 1}`).join(
      "\n"
    )
    writeFileSync(join(testDir, "large.txt"), content)

    const workspace = createTestWorkspace(testDir)
    const tools = getTools({ workspace })
    const result = await tools.Read.execute?.(
      { path: "large.txt" },
      { messages: [], toolCallId: "" }
    )

    if (result && "metadata" in result) {
      expect(result.metadata.totalLines).toBe(500)
      expect(result.metadata.linesShown).toBe(100)
      expect(result.metadata.startLine).toBe(1)
      expect(result.metadata.endLine).toBe(100)
      expect(result.metadata.isPaginated).toBe(true)
      expect(result.content).toContain("Line 1")
      expect(result.content).toContain("Line 100")
      expect(result.content).not.toContain("Line 101")
    }
  })

  test("respects explicit line range", async () => {
    const content = Array.from({ length: 300 }, (_, i) => `Line ${i + 1}`).join(
      "\n"
    )
    writeFileSync(join(testDir, "file.txt"), content)

    const workspace = createTestWorkspace(testDir)
    const tools = getTools({ workspace })
    const result = await tools.Read.execute?.(
      { path: "file.txt", startLine: 50, endLine: 75 },
      { messages: [], toolCallId: "" }
    )

    if (result && "metadata" in result) {
      expect(result.metadata.totalLines).toBe(300)
      expect(result.metadata.linesShown).toBe(26)
      expect(result.metadata.startLine).toBe(50)
      expect(result.metadata.endLine).toBe(75)
      expect(result.metadata.isPaginated).toBe(true)
      expect(result.content).toContain("Line 50")
      expect(result.content).toContain("Line 75")
      expect(result.content).not.toContain("Line 49")
      expect(result.content).not.toContain("Line 76")
    }
  })

  test("handles file not found error", async () => {
    const workspace = createTestWorkspace(testDir)
    const tools = getTools({ workspace })
    const result = await tools.Read.execute?.(
      { path: "missing.txt" },
      { messages: [], toolCallId: "" }
    )

    if (result && "metadata" in result) {
      expect(result.content).toContain("Error")
      expect(result.metadata.totalLines).toBe(0)
    }
  })

  test("respects startLine without endLine (pagination continuation)", async () => {
    const content = Array.from({ length: 368 }, (_, i) => `Line ${i + 1}`).join(
      "\n"
    )
    writeFileSync(join(testDir, "large-file.txt"), content)

    const workspace = createTestWorkspace(testDir)
    const tools = getTools({ workspace })

    // First call - should get lines 1-100
    const result1 = await tools.Read.execute?.(
      { path: "large-file.txt", startLine: 1 },
      { messages: [], toolCallId: "" }
    )

    // Second call - should get lines 101-200
    const result2 = await tools.Read.execute?.(
      { path: "large-file.txt", startLine: 101 },
      { messages: [], toolCallId: "" }
    )

    // Third call - should get lines 102-201
    const result3 = await tools.Read.execute?.(
      { path: "large-file.txt", startLine: 102 },
      { messages: [], toolCallId: "" }
    )

    if (result1 && "metadata" in result1) {
      expect(result1.metadata.startLine).toBe(1)
      expect(result1.metadata.endLine).toBe(100)
      expect(result1.content).toContain("Line 1")
      expect(result1.content).toContain("Line 100")
    }

    if (result2 && "metadata" in result2) {
      expect(result2.metadata.startLine).toBe(101)
      expect(result2.metadata.endLine).toBe(200)
      expect(result2.content).toContain("Line 101")
      expect(result2.content).toContain("Line 200")
      expect(result2.content).not.toContain("Line 1\n")
    }

    if (result3 && "metadata" in result3) {
      expect(result3.metadata.startLine).toBe(102)
      expect(result3.metadata.endLine).toBe(201)
      expect(result3.content).toContain("Line 102")
      expect(result3.content).toContain("Line 201")
    }
  })

  test("respects endLine without startLine", async () => {
    const content = Array.from({ length: 300 }, (_, i) => `Line ${i + 1}`).join(
      "\n"
    )
    writeFileSync(join(testDir, "file.txt"), content)

    const workspace = createTestWorkspace(testDir)
    const tools = getTools({ workspace })
    const result = await tools.Read.execute?.(
      { path: "file.txt", endLine: 50 },
      { messages: [], toolCallId: "" }
    )

    if (result && "metadata" in result) {
      expect(result.metadata.startLine).toBe(1)
      expect(result.metadata.endLine).toBe(50)
      expect(result.metadata.linesShown).toBe(50)
      expect(result.content).toContain("Line 1")
      expect(result.content).toContain("Line 50")
      expect(result.content).not.toContain("Line 51")
    }
  })
})

describe("Grep Tool", () => {
  test("finds basic pattern matches", async () => {
    writeFileSync(join(testDir, "file1.ts"), "// TODO: fix this\nconst x = 1")
    writeFileSync(join(testDir, "file2.ts"), "const y = 2\n// TODO: refactor")

    const workspace = createTestWorkspace(testDir)
    const tools = getTools({ workspace })
    const result = await tools.Grep.execute?.(
      { pattern: "TODO", caseSensitive: true, filesWithMatches: false },
      { messages: [], toolCallId: "" }
    )

    if (result && "summary" in result) {
      expect(result.matches).toContain("TODO")
      expect(result.summary.fileCount).toBe(2)
    }
  })

  test("supports case-insensitive search", async () => {
    writeFileSync(join(testDir, "app.ts"), "Error occurred\nerror in function")

    const workspace = createTestWorkspace(testDir)
    const tools = getTools({ workspace })
    const result = await tools.Grep.execute?.(
      { pattern: "error", caseSensitive: false, filesWithMatches: false },
      { messages: [], toolCallId: "" }
    )

    if (result && "summary" in result) {
      expect(result.matches).toContain("Error")
      expect(result.matches).toContain("error")
    }
  })

  test("filters by file type", async () => {
    writeFileSync(join(testDir, "utils.ts"), "function helper() {}")
    writeFileSync(join(testDir, "utils.js"), "function other() {}")

    const workspace = createTestWorkspace(testDir)
    const tools = getTools({ workspace })
    const result = await tools.Grep.execute?.(
      {
        pattern: "function",
        fileType: "ts",
        caseSensitive: true,
        filesWithMatches: false,
      },
      { messages: [], toolCallId: "" }
    )

    if (result && "summary" in result) {
      expect(result.matches).toContain("utils.ts")
      expect(result.matches).not.toContain("utils.js")
    }
  })

  test("handles no matches found", async () => {
    writeFileSync(join(testDir, "file.ts"), "const x = 1")

    const workspace = createTestWorkspace(testDir)
    const tools = getTools({ workspace })
    const result = await tools.Grep.execute?.(
      { pattern: "nonexistent", caseSensitive: true, filesWithMatches: false },
      { messages: [], toolCallId: "" }
    )

    if (result && "summary" in result) {
      expect(result.matches).toBe("(no matches found)")
      expect(result.summary.fileCount).toBe(0)
    }
  })
})

describe("List Tool", () => {
  test("lists directory with depth 1", async () => {
    writeFileSync(join(testDir, "file1.ts"), "")
    writeFileSync(join(testDir, "file2.ts"), "")
    mkdtempSync(join(testDir, "dir1-"))
    mkdtempSync(join(testDir, "dir2-"))

    const workspace = createTestWorkspace(testDir)
    const tools = getTools({ workspace })
    const result = await tools.List.execute?.(
      { depth: 1, includeHidden: false, filesOnly: false },
      { messages: [], toolCallId: "" }
    )

    if (result && "summary" in result) {
      expect(result.listing).toContain("./file1.ts")
      expect(result.listing).toContain("./file2.ts")
      expect(result.summary.totalFiles).toBeGreaterThanOrEqual(2)
    }
  })

  test("lists only files when filesOnly is true", async () => {
    writeFileSync(join(testDir, "file1.ts"), "")
    writeFileSync(join(testDir, "file2.ts"), "")
    mkdtempSync(join(testDir, "dir-"))

    const workspace = createTestWorkspace(testDir)
    const tools = getTools({ workspace })
    const result = await tools.List.execute?.(
      { filesOnly: true, includeHidden: false },
      { messages: [], toolCallId: "" }
    )

    if (result && "summary" in result) {
      expect(result.listing).toContain("file1.ts")
      expect(result.listing).toContain("file2.ts")
      expect(result.summary.totalFiles).toBeGreaterThanOrEqual(2)
    }
  })

  test("handles empty directory", async () => {
    const emptyDir = join(testDir, "empty")
    mkdtempSync(emptyDir)

    const workspace = createTestWorkspace(testDir)
    const tools = getTools({ workspace })
    const result = await tools.List.execute?.(
      { path: "empty", includeHidden: false, filesOnly: false },
      { messages: [], toolCallId: "" }
    )

    if (result && "summary" in result) {
      expect(result.summary.totalFiles).toBe(0)
    }
  })
})

describe("ReadPost Tool", () => {
  beforeEach(() => {
    mockDbData = { posts: [], comments: [] }
    queryCount = 0
  })

  test("throws error when post params are missing", () => {
    mockDbData = { posts: [], comments: [] }

    const workspace = createTestWorkspace(testDir)
    const tools = getTools({ workspace })

    expect(
      tools.ReadPost.execute?.({}, { messages: [], toolCallId: "" })
    ).rejects.toThrow("Post number, owner, and repository are required")
  })

  test("correctly identifies LLM-authored comments via authorId prefix", async () => {
    const now = Date.now()
    mockDbData = {
      posts: [
        {
          id: "post-1",
          number: 1,
          owner: "org",
          repo: "repo",
          title: "Test",
          createdAt: now,
          rootCommentId: "root",
        },
      ],
      comments: [
        {
          id: "root",
          postId: "post-1",
          authorId: "user-123",
          authorUsername: "human",
          content: [
            {
              id: "m1",
              role: "user",
              parts: [{ type: "text", text: "Question" }],
            },
          ],
          createdAt: now,
        },
        {
          id: "c1",
          postId: "post-1",
          authorId: "llm_claude",
          authorUsername: "assistant",
          content: [
            {
              id: "m2",
              role: "assistant",
              parts: [{ type: "text", text: "AI response" }],
            },
          ],
          createdAt: now + 1000,
        },
        {
          id: "c2",
          postId: "post-1",
          authorId: "user-456",
          authorUsername: "another-human",
          content: [
            {
              id: "m3",
              role: "user",
              parts: [{ type: "text", text: "Follow-up" }],
            },
          ],
          createdAt: now + 2000,
        },
      ],
    }

    const workspace = createTestWorkspace(testDir)
    const tools = getTools({ workspace })
    const result = await tools.ReadPost.execute?.(
      { postNumber: 1, postOwner: "org", postRepo: "repo" },
      { messages: [], toolCallId: "" }
    )

    if (result && "comments" in result) {
      expect(result.comments).toHaveLength(2)
      expect(result.comments[0].isFromLLM).toBe(true)
      expect(result.comments[0].authorUsername).toBe("assistant")
      expect(result.comments[1].isFromLLM).toBe(false)
      expect(result.comments[1].authorUsername).toBe("another-human")
    }
  })

  test("extracts text from multi-part messages and joins with double newlines", async () => {
    const now = Date.now()
    mockDbData = {
      posts: [
        {
          id: "post-1",
          number: 1,
          owner: "org",
          repo: "repo",
          title: "Test",
          createdAt: now,
          rootCommentId: "root",
        },
      ],
      comments: [
        {
          id: "root",
          postId: "post-1",
          authorId: "user-1",
          authorUsername: "author",
          content: [
            {
              id: "m1",
              role: "user",
              parts: [{ type: "text", text: "First paragraph" }],
            },
            {
              id: "m2",
              role: "user",
              parts: [
                { type: "text", text: "Second paragraph" },
                { type: "tool-invocation", toolName: "Read", args: {} },
                { type: "text", text: "Third paragraph" },
              ],
            },
          ],
          createdAt: now,
        },
      ],
    }

    const workspace = createTestWorkspace(testDir)
    const tools = getTools({ workspace })
    const result = await tools.ReadPost.execute?.(
      { postNumber: 1, postOwner: "org", postRepo: "repo" },
      { messages: [], toolCallId: "" }
    )

    if (result && "rootComment" in result) {
      expect(result.rootComment.content).toBe(
        "First paragraph\n\nSecond paragraph\n\nThird paragraph"
      )
    }
  })
})

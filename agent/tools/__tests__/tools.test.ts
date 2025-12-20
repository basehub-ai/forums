import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getTools } from "../index";
import { createTestWorkspace } from "./test-helpers";

let testDir: string;

beforeEach(() => {
  testDir = mkdtempSync(join(tmpdir(), "agent-tools-test-"));
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe("Read Tool", () => {
  test("reads small file (<200 lines) fully", async () => {
    const content = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}`).join(
      "\n",
    );
    writeFileSync(join(testDir, "small.txt"), content);

    const workspace = createTestWorkspace(testDir);
    const tools = getTools({ workspace });
    const result = await tools.Read.execute?.(
      { path: "small.txt" },
      { messages: [], toolCallId: "" },
    );

    if (result && "metadata" in result) {
      expect(result?.metadata.totalLines).toBe(50);
      expect(result?.metadata.linesShown).toBe(50);
      expect(result?.metadata.startLine).toBe(1);
      expect(result?.metadata.endLine).toBe(50);
      expect(result?.metadata.isPaginated).toBe(false);
      expect(result?.content).toContain("Line 1");
      expect(result?.content).toContain("Line 50");
    }
  });

  test("paginates large file (>200 lines) automatically", async () => {
    const content = Array.from({ length: 500 }, (_, i) => `Line ${i + 1}`).join(
      "\n",
    );
    writeFileSync(join(testDir, "large.txt"), content);

    const workspace = createTestWorkspace(testDir);
    const tools = getTools({ workspace });
    const result = await tools.Read.execute?.(
      { path: "large.txt" },
      { messages: [], toolCallId: "" },
    );

    if (result && "metadata" in result) {
      expect(result.metadata.totalLines).toBe(500);
      expect(result.metadata.linesShown).toBe(100);
      expect(result.metadata.startLine).toBe(1);
      expect(result.metadata.endLine).toBe(100);
      expect(result.metadata.isPaginated).toBe(true);
      expect(result.content).toContain("Line 1");
      expect(result.content).toContain("Line 100");
      expect(result.content).not.toContain("Line 101");
    }
  });

  test("respects explicit line range", async () => {
    const content = Array.from({ length: 300 }, (_, i) => `Line ${i + 1}`).join(
      "\n",
    );
    writeFileSync(join(testDir, "file.txt"), content);

    const workspace = createTestWorkspace(testDir);
    const tools = getTools({ workspace });
    const result = await tools.Read.execute?.(
      { path: "file.txt", startLine: 50, endLine: 75 },
      { messages: [], toolCallId: "" },
    );

    if (result && "metadata" in result) {
      expect(result.metadata.totalLines).toBe(300);
      expect(result.metadata.linesShown).toBe(26);
      expect(result.metadata.startLine).toBe(50);
      expect(result.metadata.endLine).toBe(75);
      expect(result.metadata.isPaginated).toBe(true);
      expect(result.content).toContain("Line 50");
      expect(result.content).toContain("Line 75");
      expect(result.content).not.toContain("Line 49");
      expect(result.content).not.toContain("Line 76");
    }
  });

  test("handles file not found error", async () => {
    const workspace = createTestWorkspace(testDir);
    const tools = getTools({ workspace });
    const result = await tools.Read.execute?.(
      { path: "missing.txt" },
      { messages: [], toolCallId: "" },
    );

    if (result && "metadata" in result) {
      expect(result.content).toContain("Error");
      expect(result.metadata.totalLines).toBe(0);
    }
  });
});

describe("Grep Tool", () => {
  test("finds basic pattern matches", async () => {
    writeFileSync(join(testDir, "file1.ts"), "// TODO: fix this\nconst x = 1");
    writeFileSync(join(testDir, "file2.ts"), "const y = 2\n// TODO: refactor");

    const workspace = createTestWorkspace(testDir);
    const tools = getTools({ workspace });
    const result = await tools.Grep.execute?.(
      { pattern: "TODO", caseSensitive: true, filesWithMatches: false },
      { messages: [], toolCallId: "" },
    );

    if (result && "summary" in result) {
      expect(result.matches).toContain("TODO");
      expect(result.summary.fileCount).toBe(2);
    }
  });

  test("supports case-insensitive search", async () => {
    writeFileSync(join(testDir, "app.ts"), "Error occurred\nerror in function");

    const workspace = createTestWorkspace(testDir);
    const tools = getTools({ workspace });
    const result = await tools.Grep.execute?.(
      { pattern: "error", caseSensitive: false, filesWithMatches: false },
      { messages: [], toolCallId: "" },
    );

    if (result && "summary" in result) {
      expect(result.matches).toContain("Error");
      expect(result.matches).toContain("error");
    }
  });

  test("filters by file type", async () => {
    writeFileSync(join(testDir, "utils.ts"), "function helper() {}");
    writeFileSync(join(testDir, "utils.js"), "function other() {}");

    const workspace = createTestWorkspace(testDir);
    const tools = getTools({ workspace });
    const result = await tools.Grep.execute?.(
      {
        pattern: "function",
        fileType: "ts",
        caseSensitive: true,
        filesWithMatches: false,
      },
      { messages: [], toolCallId: "" },
    );

    if (result && "summary" in result) {
      expect(result.matches).toContain("utils.ts");
      expect(result.matches).not.toContain("utils.js");
    }
  });

  test("handles no matches found", async () => {
    writeFileSync(join(testDir, "file.ts"), "const x = 1");

    const workspace = createTestWorkspace(testDir);
    const tools = getTools({ workspace });
    const result = await tools.Grep.execute?.(
      { pattern: "nonexistent", caseSensitive: true, filesWithMatches: false },
      { messages: [], toolCallId: "" },
    );

    if (result && "summary" in result) {
      expect(result.matches).toBe("(no matches found)");
      expect(result.summary.fileCount).toBe(0);
    }
  });
});

describe("List Tool", () => {
  test("lists directory with depth 1", async () => {
    writeFileSync(join(testDir, "file1.ts"), "");
    writeFileSync(join(testDir, "file2.ts"), "");
    mkdtempSync(join(testDir, "dir1-"));
    mkdtempSync(join(testDir, "dir2-"));

    const workspace = createTestWorkspace(testDir);
    const tools = getTools({ workspace });
    const result = await tools.List.execute?.(
      { depth: 1, includeHidden: false, filesOnly: false },
      { messages: [], toolCallId: "" },
    );

    if (result && "summary" in result) {
      expect(result.listing).toContain("./file1.ts");
      expect(result.listing).toContain("./file2.ts");
      expect(result.summary.totalFiles).toBeGreaterThanOrEqual(2);
    }
  });

  test("lists only files when filesOnly is true", async () => {
    writeFileSync(join(testDir, "file1.ts"), "");
    writeFileSync(join(testDir, "file2.ts"), "");
    mkdtempSync(join(testDir, "dir-"));

    const workspace = createTestWorkspace(testDir);
    const tools = getTools({ workspace });
    const result = await tools.List.execute?.(
      { filesOnly: true, includeHidden: false },
      { messages: [], toolCallId: "" },
    );

    if (result && "summary" in result) {
      expect(result.listing).toContain("file1.ts");
      expect(result.listing).toContain("file2.ts");
      expect(result.summary.totalFiles).toBeGreaterThanOrEqual(2);
    }
  });

  test("handles empty directory", async () => {
    const emptyDir = join(testDir, "empty");
    mkdtempSync(emptyDir);

    const workspace = createTestWorkspace(testDir);
    const tools = getTools({ workspace });
    const result = await tools.List.execute?.(
      { path: "empty", includeHidden: false, filesOnly: false },
      { messages: [], toolCallId: "" },
    );

    if (result && "summary" in result) {
      expect(result.summary.totalFiles).toBe(0);
    }
  });
});

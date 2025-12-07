import { extractTool, searchTool } from "@parallel-web/ai-sdk-tools"
import { type ToolSet, tool } from "ai"
import { join } from "path"
import { z } from "zod"
import type { Workspace } from "../workspace"

export type ToolContext = {
  workspace: Workspace
}

export function getTools(context: ToolContext) {
  return {
    Read: tool({
      name: "Read",
      description:
        "Reads a file and returns its contents with metadata. For files over 200 lines, automatically shows first 100 lines unless a specific line range is provided. Use startLine and endLine parameters to read specific portions of large files.",
      inputSchema: z.object({
        path: z
          .string()
          .describe("Path to the file relative to workspace root"),
        startLine: z
          .number()
          .optional()
          .describe(
            "Starting line number (1-indexed). If provided with endLine, reads exact range regardless of file size."
          ),
        endLine: z
          .number()
          .optional()
          .describe(
            "Ending line number (1-indexed, inclusive). If provided with startLine, reads exact range regardless of file size."
          ),
      }),
      outputSchema: z.object({
        content: z.string().describe("File content"),
        metadata: z.object({
          totalLines: z.number().describe("Total number of lines in the file"),
          linesShown: z
            .number()
            .describe("Number of lines included in this response"),
          startLine: z.number().describe("First line number shown (1-indexed)"),
          endLine: z.number().describe("Last line number shown (1-indexed)"),
          isPaginated: z
            .boolean()
            .describe("Whether this is a partial view of the file"),
          fileSize: z
            .string()
            .describe("Human-readable file size (e.g., '2.5K', '1.2M')"),
          path: z.string().describe("Absolute path to the file"),
        }),
      }),
      execute: async ({ path, startLine, endLine }) => {
        const fullPath = join(context.workspace.path, path)

        const result = await context.workspace.sandbox.runCommand("bash", [
          "-c",
          `
            set -e
            FILE="$1"
            START_LINE="$2"
            END_LINE="$3"

            # Get metadata (count actual lines, not just newlines)
            TOTAL_LINES=$(awk 'END{print NR}' "$FILE")
            FILE_SIZE=$(ls -lh "$FILE" | awk '{print $5}')

            # Determine range
            if [ -n "$START_LINE" ] && [ -n "$END_LINE" ]; then
              # Explicit range provided
              ACTUAL_START=$START_LINE
              ACTUAL_END=$END_LINE
            elif [ "$TOTAL_LINES" -gt 200 ]; then
              # Paginate
              ACTUAL_START=1
              ACTUAL_END=100
            else
              # Show full file
              ACTUAL_START=1
              ACTUAL_END=$TOTAL_LINES
            fi

            # Output metadata first (separated by ||| for parsing)
            echo "$TOTAL_LINES|$FILE_SIZE|$ACTUAL_START|$ACTUAL_END"
            echo "|||CONTENT|||"

            # Read content
            if [ "$ACTUAL_START" -eq 1 ] && [ "$ACTUAL_END" -eq "$TOTAL_LINES" ]; then
              cat "$FILE"
            else
              sed -n "\${ACTUAL_START},\${ACTUAL_END}p" "$FILE"
            fi
          `,
          "--",
          fullPath,
          startLine?.toString() || "",
          endLine?.toString() || "",
        ])

        const [stdout, stderr] = await Promise.all([
          result.stdout(),
          result.stderr(),
        ])

        if (stderr) {
          console.error(`[Read Tool] Error: ${stderr}`)
          return {
            content: `Error: ${stderr}`,
            metadata: {
              totalLines: 0,
              linesShown: 0,
              startLine: 0,
              endLine: 0,
              isPaginated: false,
              fileSize: "0",
              path: fullPath,
            },
          }
        }

        const [metadataLine, ...rest] = stdout.split("|||CONTENT|||")
        const content = rest.join("|||CONTENT|||").trimStart()
        const [totalLinesStr, fileSize, actualStartStr, actualEndStr] =
          metadataLine.trim().split("|")

        const totalLines = Number.parseInt(totalLinesStr, 10)
        const actualStart = Number.parseInt(actualStartStr, 10)
        const actualEnd = Number.parseInt(actualEndStr, 10)

        return {
          content,
          metadata: {
            totalLines,
            linesShown: Math.max(0, actualEnd - actualStart + 1),
            startLine: actualStart,
            endLine: actualEnd,
            isPaginated: actualEnd < totalLines,
            fileSize: fileSize || "unknown",
            path: fullPath,
          },
        }
      },
    }),

    Grep: tool({
      name: "Grep",
      description:
        "Search for patterns in files using ripgrep. Supports regex patterns, file type filtering, and context lines. Returns matching lines with file paths and line numbers. Use this to find code patterns, function definitions, imports, etc.",
      inputSchema: z.object({
        pattern: z
          .string()
          .describe("Regex pattern to search for (ripgrep syntax)"),
        path: z
          .string()
          .optional()
          .describe(
            "Path to search in (defaults to workspace root). Can be a file or directory."
          ),
        fileType: z
          .string()
          .optional()
          .describe(
            "File type to filter by (e.g., 'ts', 'js', 'py', 'md'). Uses ripgrep's built-in type filters."
          ),
        glob: z
          .string()
          .optional()
          .describe(
            "Glob pattern to filter files (e.g., '*.tsx', 'src/**/*.ts')"
          ),
        caseSensitive: z
          .boolean()
          .optional()
          .default(true)
          .describe("Whether search is case-sensitive (default: true)"),
        contextLines: z
          .number()
          .optional()
          .describe(
            "Number of context lines to show before and after each match"
          ),
        maxCount: z
          .number()
          .optional()
          .describe(
            "Maximum number of matches per file (useful for limiting output)"
          ),
        filesWithMatches: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Only show file paths that contain matches, not the matching lines themselves"
          ),
      }),
      outputSchema: z.object({
        matches: z
          .string()
          .describe(
            "Search results with file paths, line numbers, and matching content"
          ),
        summary: z.object({
          matchCount: z.number().describe("Number of matches found"),
          fileCount: z.number().describe("Number of files containing matches"),
          searchPath: z.string().describe("Path that was searched"),
          pattern: z.string().describe("Pattern that was searched for"),
        }),
      }),
      execute: async ({
        pattern,
        path,
        fileType,
        glob,
        caseSensitive,
        contextLines,
        maxCount,
        filesWithMatches,
      }) => {
        const searchPath = path
          ? join(context.workspace.path, path)
          : context.workspace.path

        const args: string[] = []

        args.push("--line-number")
        args.push("--heading")
        args.push("--color", "never")

        if (!caseSensitive) {
          args.push("-i")
        }

        if (fileType) {
          args.push("--type", fileType)
        }

        if (glob) {
          args.push("--glob", glob)
        }

        if (contextLines !== undefined) {
          args.push("-C", String(contextLines))
        }

        if (maxCount !== undefined) {
          args.push("--max-count", String(maxCount))
        }

        if (filesWithMatches) {
          args.push("--files-with-matches")
        }

        args.push("--", pattern, searchPath)

        const result = await context.workspace.sandbox.runCommand("rg", args)
        const [stdout, stderr] = await Promise.all([
          result.stdout(),
          result.stderr(),
        ])

        if (stderr && !stderr.toLowerCase().includes("no matches")) {
          console.error(`[Grep Tool] Warning: ${stderr}`)
        }

        const lines = stdout
          .trim()
          .split("\n")
          .filter((l) => l.length > 0)
        const fileCount = filesWithMatches
          ? lines.length
          : new Set(
              lines
                .filter((l) => !l.startsWith(" ") && l.includes(":"))
                .map((l) => l.split(":")[0])
            ).size

        return {
          matches: stdout || "(no matches found)",
          summary: {
            matchCount: filesWithMatches
              ? 0
              : lines.filter((l) => l.includes(":")).length,
            fileCount,
            searchPath,
            pattern,
          },
        }
      },
    }),

    List: tool({
      name: "List",
      description:
        "Recursively list directory contents. Use this to understand the codebase structure, find files, or explore directories. Control depth to balance detail vs. overview. Depth 1 shows immediate children, depth 2 includes subdirectories, etc.",
      inputSchema: z.object({
        path: z
          .string()
          .optional()
          .describe("Path to list (defaults to workspace root)"),
        depth: z
          .number()
          .optional()
          .describe(
            "Maximum depth to traverse. Choose based on context: 1-2 for quick overview, 3-4 for detailed exploration, 5+ for comprehensive mapping"
          ),
        includeHidden: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Include hidden files and directories (those starting with '.')"
          ),
        filesOnly: z
          .boolean()
          .optional()
          .default(false)
          .describe("Only show files, not directories"),
        pattern: z
          .string()
          .optional()
          .describe("Glob pattern to filter results (e.g., '*.ts', '*test*')"),
      }),
      outputSchema: z.object({
        listing: z
          .string()
          .describe(
            "Directory tree listing showing paths relative to search root"
          ),
        summary: z.object({
          totalItems: z.number().describe("Total number of items found"),
          totalFiles: z.number().describe("Total number of files found"),
          totalDirs: z.number().describe("Total number of directories found"),
          searchPath: z.string().describe("Path that was listed"),
          depth: z
            .number()
            .optional()
            .describe("Maximum depth used (if specified)"),
        }),
      }),
      execute: async ({ path, depth, includeHidden, filesOnly, pattern }) => {
        const searchPath = path
          ? join(context.workspace.path, path)
          : context.workspace.path

        const result = await context.workspace.sandbox.runCommand("bash", [
          "-c",
          `
            set -e
            SEARCH_PATH="$1"
            DEPTH="$2"
            INCLUDE_HIDDEN="$3"
            FILES_ONLY="$4"
            PATTERN="$5"

            # Build find command
            FIND_CMD="find \\"$SEARCH_PATH\\""

            [ -n "$DEPTH" ] && FIND_CMD="$FIND_CMD -maxdepth $DEPTH"

            if [ "$INCLUDE_HIDDEN" != "true" ]; then
              FIND_CMD="$FIND_CMD \\( -path '*/.*' -prune \\) -o \\("
            fi

            [ "$FILES_ONLY" = "true" ] && FIND_CMD="$FIND_CMD -type f"
            [ -n "$PATTERN" ] && FIND_CMD="$FIND_CMD -name \\"$PATTERN\\""

            FIND_CMD="$FIND_CMD -print"

            if [ "$INCLUDE_HIDDEN" != "true" ]; then
              FIND_CMD="$FIND_CMD \\)"
            fi

            # Get listing
            LISTING=$(eval $FIND_CMD 2>/dev/null | sort)

            # Get counts
            COUNT_BASE="find \\"$SEARCH_PATH\\""
            [ -n "$DEPTH" ] && COUNT_BASE="$COUNT_BASE -maxdepth $DEPTH"
            [ "$INCLUDE_HIDDEN" != "true" ] && COUNT_BASE="$COUNT_BASE ! -path '*/.*'"

            FILE_COUNT=$(eval "$COUNT_BASE -type f 2>/dev/null | wc -l" || echo 0)
            DIR_COUNT=$(eval "$COUNT_BASE -type d 2>/dev/null | wc -l" || echo 0)

            # Output: counts first, then listing
            echo "$FILE_COUNT|$DIR_COUNT"
            echo "|||LISTING|||"
            echo "$LISTING" | sed "s|^$SEARCH_PATH|.|"
          `,
          "--",
          searchPath,
          depth?.toString() || "",
          includeHidden ? "true" : "false",
          filesOnly ? "true" : "false",
          pattern || "",
        ])

        const [stdout, stderr] = await Promise.all([
          result.stdout(),
          result.stderr(),
        ])

        if (stderr) {
          console.error(`[List Tool] Warning: ${stderr}`)
        }

        const [countsLine, ...rest] = stdout.split("|||LISTING|||")
        const listing = rest.join("|||LISTING|||").trim()
        const [fileCountStr, dirCountStr] = countsLine.trim().split("|")

        const totalFiles = Number.parseInt(fileCountStr, 10) || 0
        const totalDirs = Number.parseInt(dirCountStr, 10) || 0
        const lines = listing.split("\n").filter((l) => l.length > 0)

        return {
          listing,
          summary: {
            totalItems: lines.length,
            totalFiles,
            totalDirs,
            searchPath,
            depth,
          },
        }
      },
    }),

    WebSearch: searchTool,
    WebExtract: extractTool,
  } satisfies ToolSet
}

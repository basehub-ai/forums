import { readFile } from "fs/promises"
import { createRequire } from "module"
import { dirname, join } from "path"

/**
 * Resolves the path to a font file from the `geist` package.
 *
 * Using `process.cwd()` + `node_modules/geist/...` breaks on Vercel in
 * monorepo setups because dependencies are hoisted to the workspace root
 * while `process.cwd()` points to the app directory (e.g. `apps/web`).
 *
 * Instead, we use `createRequire` to resolve a known export from the `geist`
 * package, then navigate relative to that resolved path to find the font files.
 */
function resolveGeistFontPath(fontFile: string): string {
  const require = createRequire(import.meta.url)
  const geistMonoEntry = require.resolve("geist/font/mono")
  // geistMonoEntry resolves to e.g. `.../node_modules/geist/dist/mono.js`
  // fonts are at `.../node_modules/geist/dist/fonts/geist-mono/`
  return join(dirname(geistMonoEntry), "fonts", "geist-mono", fontFile)
}

export const geistMonoRegular = readFile(
  resolveGeistFontPath("GeistMono-Regular.ttf")
)
export const geistMonoBold = readFile(
  resolveGeistFontPath("GeistMono-Bold.ttf")
)

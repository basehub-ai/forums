import { readFile } from "fs/promises"
import { join } from "path"

/**
 * Loads Geist Mono font files for OG image generation.
 *
 * Font files are vendored into `public/fonts/` so they can be read via
 * `process.cwd()` on Vercel (same pattern used by `public/icon.svg`).
 *
 * We can't read from `node_modules/geist/...` because in a monorepo
 * dependencies are hoisted to the workspace root while `process.cwd()`
 * points to the app directory (e.g. `apps/web`).
 */
const fontsDir = join(process.cwd(), "public", "fonts")

export const geistMonoRegular = readFile(
  join(fontsDir, "GeistMono-Regular.ttf")
)
export const geistMonoBold = readFile(join(fontsDir, "GeistMono-Bold.ttf"))

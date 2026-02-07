import { readFile } from "fs/promises"
import { join } from "path"

let fontsPromise: ReturnType<typeof loadFontsFromDisk> | null = null

async function loadFontsFromDisk() {
  const fontsDir = join(process.cwd(), "app/api/og/_fonts")

  const [fontRegular, fontBold] = await Promise.all([
    readFile(join(fontsDir, "GeistMono-Regular.ttf")),
    readFile(join(fontsDir, "GeistMono-Bold.ttf")),
  ])

  return [
    {
      name: "Geist Mono",
      data: fontRegular,
      weight: 400 as const,
    },
    {
      name: "Geist Mono",
      data: fontBold,
      weight: 700 as const,
    },
  ]
}

export function loadFonts() {
  if (!fontsPromise) {
    fontsPromise = loadFontsFromDisk()
  }
  return fontsPromise
}

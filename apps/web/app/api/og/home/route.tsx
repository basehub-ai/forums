import { readFile } from "fs/promises"
import { ImageResponse } from "next/og"
import { join } from "path"
import { getSiteOrigin } from "@/lib/utils"

const size = {
  width: 1200,
  height: 630,
}

const geistMonoRegular = readFile(
  join(
    process.cwd(),
    "node_modules/geist/dist/fonts/geist-mono/GeistMono-Regular.ttf"
  )
)
const geistMonoBold = readFile(
  join(
    process.cwd(),
    "node_modules/geist/dist/fonts/geist-mono/GeistMono-Bold.ttf"
  )
)

export async function GET() {
  const [fontRegular, fontBold] = await Promise.all([
    geistMonoRegular,
    geistMonoBold,
  ])

  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fafafa",
        padding: 60,
        fontFamily: "Geist Mono",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
          }}
        >
          <img
            alt="Forums"
            height={120}
            src={`${getSiteOrigin()}/icon.svg`}
            width={120}
          />
          <span
            style={{
              fontSize: 96,
              fontWeight: 500,
              color: "#040404",
            }}
          >
            FORUMS
          </span>
        </div>
        <div
          style={{
            fontSize: 48,
            color: "#71717a",
            textWrap: "balance",
            maxWidth: 1200,
          }}
        >
          Ask a question inside any GitHub Repository
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        {
          name: "Geist Mono",
          data: fontRegular,
          weight: 400,
        },
        {
          name: "Geist Mono",
          data: fontBold,
          weight: 700,
        },
      ],
    }
  )
}

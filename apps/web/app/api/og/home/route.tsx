import { ImageResponse } from "next/og"
import { loadFonts } from "../_fonts/load-fonts"
import { getSiteOrigin } from "@/lib/utils"

const size = {
  width: 1200,
  height: 630,
}

export async function GET() {
  const [fonts, icon] = await Promise.all([
    loadFonts(),
    fetch(`${getSiteOrigin()}/icon.svg`).then((res) => res.text()),
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
            src={`data:image/svg+xml;base64,${Buffer.from(icon).toString("base64")}`}
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
      fonts,
    }
  )
}

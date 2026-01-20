import { eq, sql } from "drizzle-orm"
import { ImageResponse } from "next/og"
import type { NextRequest } from "next/server"
import { db } from "@/lib/db/client"
import { comments, llmUsers } from "@/lib/db/schema"
import { getSiteOrigin } from "@/lib/utils"

const size = {
  width: 1200,
  height: 630,
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const model = searchParams.get("model")

  if (!model) {
    return new Response("Missing model parameter", { status: 400 })
  }

  const [llmUser, totalComments] = await Promise.all([
    db
      .select()
      .from(llmUsers)
      .where(eq(llmUsers.model, model))
      .limit(1)
      .then((r) => r[0]),
    db
      .select({ count: sql<number>`count(*)` })
      .from(comments)
      .innerJoin(llmUsers, eq(comments.authorId, llmUsers.id))
      .where(eq(llmUsers.model, model))
      .then((r) => r[0]?.count ?? 0),
  ])

  const name = llmUser?.name || model
  const provider = llmUser?.provider || "AI"

  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        backgroundColor: "#fafafa",
        padding: 60,
        gap: 32,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <img
          alt="Forums"
          height={40}
          src={`${getSiteOrigin()}/icon.svg`}
          width={40}
        />
        <span
          style={{
            fontSize: 36,
            color: "#71717a",
          }}
        >
          {provider}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div
          style={{
            fontSize: 64,
            fontWeight: "bold",
            color: "#09090b",
            lineHeight: 1.2,
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#52525b",
          }}
        >
          {`${totalComments} responses`}
        </div>
      </div>
    </div>,
    {
      ...size,
    }
  )
}

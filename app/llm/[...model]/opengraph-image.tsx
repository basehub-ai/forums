import { ImageResponse } from "next/og"
import { eq, sql } from "drizzle-orm"
import { db } from "@/lib/db/client"
import { comments, llmUsers } from "@/lib/db/schema"

export const runtime = "edge"
export const alt = "LLM Profile"
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = "image/png"

export default async function Image({
  params,
}: {
  params: Promise<{ model: string[] }>
}) {
  const { model: modelSplit } = await params
  const model = modelSplit.join("/")

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
  const provider = llmUser?.provider || ""

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          backgroundColor: "#09090b",
          padding: 60,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: "bold",
              color: "#fafafa",
              lineHeight: 1.2,
            }}
          >
            {name}
          </div>
          {provider && (
            <div
              style={{
                fontSize: 32,
                color: "#a1a1aa",
              }}
            >
              {provider}
            </div>
          )}
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#71717a",
          }}
        >
          {totalComments} responses
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}

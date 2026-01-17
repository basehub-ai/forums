import { headers } from "next/headers"
import { auth, isAdmin } from "@/lib/auth"
import { reindexCommentsWithoutEmbeddings } from "@/lib/typesense-index"

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!isAdmin(session?.user)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await reindexCommentsWithoutEmbeddings()
    return Response.json({ success: true, ...result })
  } catch (error) {
    console.error("Reindex embeddings error:", error)
    return Response.json(
      { success: false, error: "Reindexing failed" },
      { status: 500 }
    )
  }
}

import { headers } from "next/headers"
import { auth, isAdmin } from "@/lib/auth"
import { reindexAll } from "@/lib/typesense-index"

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!isAdmin(session?.user)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const counts = await reindexAll()
    return Response.json({ success: true, ...counts })
  } catch (error) {
    console.error("Reindex error:", error)
    return Response.json({ success: false, error: "Reindex failed" }, { status: 500 })
  }
}

import { headers } from "next/headers"
import { auth, isAdmin } from "@/lib/auth"
import { ensureCollections } from "@/lib/typesense-index"

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!isAdmin(session?.user)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await ensureCollections()
    return Response.json({ success: true })
  } catch (error) {
    console.error("Ensure collections error:", error)
    return Response.json(
      { success: false, error: "Failed to ensure collections" },
      { status: 500 }
    )
  }
}

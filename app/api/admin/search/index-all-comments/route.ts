import { headers } from "next/headers"
import { auth, isAdmin } from "@/lib/auth"
import { indexAllComments } from "@/lib/typesense-index"

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!isAdmin(session?.user)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await indexAllComments()
    return Response.json({ success: true, ...result })
  } catch (error) {
    console.error("Index all comments error:", error)
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}

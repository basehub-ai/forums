import { headers } from "next/headers"
import { auth, isAdmin } from "@/lib/auth"
import { indexAllRepos } from "@/lib/turbopuffer-index"

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!isAdmin(session?.user)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const count = await indexAllRepos()
    return Response.json({ success: true, indexed: count })
  } catch (error) {
    console.error("Indexing error:", error)
    return Response.json(
      { success: false, error: "Indexing failed" },
      { status: 500 }
    )
  }
}

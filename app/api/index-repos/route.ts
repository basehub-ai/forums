import { indexAllRepos } from "@/lib/turbopuffer-index"

export async function POST() {
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

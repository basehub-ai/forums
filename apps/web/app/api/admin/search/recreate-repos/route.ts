import { headers } from "next/headers"
import { auth, isAdmin } from "@/lib/auth"
import { typesense } from "@/lib/typesense"

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!isAdmin(session?.user)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Try to delete existing collection
    try {
      await typesense.collections("repos").delete()
    } catch {
      // Collection might not exist, that's fine
    }

    // Create fresh collection
    await typesense.collections().create({
      name: "repos",
      fields: [
        { name: "id", type: "string" },
        { name: "name", type: "string" },
        { name: "owner", type: "string" },
        { name: "repo", type: "string" },
        { name: "posts", type: "int32" },
        { name: "lastActive", type: "int64" },
      ],
      default_sorting_field: "lastActive",
    })

    return Response.json({ success: true })
  } catch (error) {
    console.error("Recreate repos collection error:", error)
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}

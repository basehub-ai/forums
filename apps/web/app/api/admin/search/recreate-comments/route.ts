import { headers } from "next/headers"
import { auth, isAdmin } from "@/lib/auth"
import { typesense } from "@/lib/typesense"

const EMBEDDING_DIMENSIONS = 1536

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!isAdmin(session?.user)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    try {
      await typesense.collections("comments").delete()
    } catch {
      // Collection might not exist
    }

    await typesense.collections().create({
      name: "comments",
      fields: [
        { name: "id", type: "string" },
        { name: "postId", type: "string", facet: true },
        { name: "postNumber", type: "int32" },
        { name: "categoryId", type: "string", optional: true, facet: true },
        { name: "owner", type: "string", facet: true },
        { name: "repo", type: "string", facet: true },
        { name: "authorId", type: "string", facet: true },
        { name: "text", type: "string" },
        { name: "isRootComment", type: "bool", facet: true },
        { name: "createdAt", type: "int64" },
        {
          name: "embedding",
          type: "float[]",
          num_dim: EMBEDDING_DIMENSIONS,
          optional: true,
        },
      ],
      default_sorting_field: "createdAt",
    })

    return Response.json({ success: true })
  } catch (error) {
    console.error("Recreate comments collection error:", error)
    return Response.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}

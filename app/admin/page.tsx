import Link from "next/link"
import { IndexReposButton } from "./index-repos-button"

export default function AdminPage() {
  return (
    <div className="space-y-4">
      <Link
        className="block rounded-lg border p-4 hover:bg-muted"
        href="/admin/llm-users"
      >
        <h2 className="font-semibold">LLM Users</h2>
        <p className="text-muted-foreground text-sm">
          Manage AI models that can respond in the forum
        </p>
      </Link>
      <div className="rounded-lg border p-4">
        <h2 className="font-semibold">Index Repositories</h2>
        <p className="mb-3 text-muted-foreground text-sm">
          Re-index all repositories in Turbopuffer for search
        </p>
        <IndexReposButton />
      </div>
    </div>
  )
}

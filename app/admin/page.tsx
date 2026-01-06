import Link from "next/link"
import { IndexReposButton } from "./index-repos-button"

export default function AdminPage() {
  return (
    <div className="space-y-2">
      <Link
        className="group flex items-center gap-2 text-dim hover:underline"
        href="/admin/llm-users"
      >
        <span className="text-bright group-hover:text-bright">LLM Users</span>
        <span className="text-muted text-sm">
          — Manage AI models that can respond in the forum
        </span>
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

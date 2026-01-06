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
      <div className="flex items-center gap-3">
        <IndexReposButton />
        <span className="text-muted text-sm">
          — Rebuild search index (repos, posts, comments)
        </span>
      </div>
    </div>
  )
}

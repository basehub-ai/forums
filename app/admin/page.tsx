import Link from "next/link"
import { DeleteTitlelessPostsButton } from "./delete-titleless-posts-button"

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
      <Link
        className="group flex items-center gap-2 text-dim hover:underline"
        href="/admin/search"
      >
        <span className="text-bright group-hover:text-bright">Search</span>
        <span className="text-muted text-sm">
          — Manage Typesense collections and indexing
        </span>
      </Link>
      <div className="flex items-center gap-3">
        <DeleteTitlelessPostsButton />
        <span className="text-muted text-sm">
          — Delete all posts without a title
        </span>
      </div>
    </div>
  )
}

import { EnsureCollectionsButton } from "./ensure-collections-button"
import { IndexReposButton } from "./index-repos-button"

export default function AdminSearchPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-bright text-lg">Search Administration</h1>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <EnsureCollectionsButton />
          <span className="text-muted text-sm">
            — Create Typesense collections if missing
          </span>
        </div>
        <div className="flex items-center gap-3">
          <IndexReposButton />
          <span className="text-muted text-sm">
            — Re-index all repositories for search
          </span>
        </div>
      </div>
    </div>
  )
}

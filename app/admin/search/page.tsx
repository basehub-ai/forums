import { EnsureCollectionsButton } from "./ensure-collections-button"
import { IndexReposButton } from "./index-repos-button"
import { RecreateCommentsButton } from "./recreate-comments-button"
import { RecreateReposButton } from "./recreate-repos-button"
import { ReindexEmbeddingsButton } from "./reindex-embeddings-button"

export default function AdminSearchPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-bright text-lg">Search Administration</h1>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <EnsureCollectionsButton />
        </div>
        <div className="flex items-center gap-2">
          <RecreateReposButton />
        </div>
        <div className="flex items-center gap-2">
          <RecreateCommentsButton />
        </div>
        <div className="flex items-center gap-2">
          <IndexReposButton />
        </div>
        <div className="flex items-center gap-2">
          <ReindexEmbeddingsButton />
        </div>
      </div>
    </div>
  )
}

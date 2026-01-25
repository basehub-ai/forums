import { Globe, Lock, User } from "lucide-react"
import { parseVisibility } from "@/lib/data/permissions"

export function VisibilityBadge({ visibility }: { visibility: string }) {
  const vis = parseVisibility(visibility)

  if (vis.type === "public") {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
        <Globe absoluteStrokeWidth className="h-3 w-3" />
      </span>
    )
  }
  if (vis.type === "repo") {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
        <Lock absoluteStrokeWidth className="h-3 w-3" />
        Repo members
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
      <User absoluteStrokeWidth className="h-3 w-3" />
      Only you
    </span>
  )
}

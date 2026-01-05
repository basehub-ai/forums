import { Container } from "@/components/container"
import { List } from "@/components/typography"

export function ProfileSkeleton() {
  return (
    <Container>
      <div className="mb-8 flex items-center gap-3">
        <div className="h-12 w-12 animate-pulse rounded-full bg-muted/50" />
        <div className="space-y-2">
          <div className="h-5 w-40 animate-pulse rounded bg-muted/50" />
          <div className="h-4 w-28 animate-pulse rounded bg-muted/50" />
        </div>
      </div>

      <div className="mb-4 h-4 w-32 animate-pulse rounded bg-muted/50" />

      <List>
        {[1, 2, 3].map((i) => (
          <div className="flex items-start gap-1" key={i}>
            <div className="mt-0.5 h-4 w-4 animate-pulse rounded bg-muted/50" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-48 animate-pulse rounded bg-muted/50" />
              <div className="h-3 w-full max-w-80 animate-pulse rounded bg-muted/50" />
            </div>
          </div>
        ))}
      </List>
    </Container>
  )
}

import { Suspense } from "react"

function ProfileSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center gap-4">
        <div className="h-16 w-16 animate-pulse rounded-full bg-muted" />
        <div className="space-y-2">
          <div className="h-7 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        </div>
      </div>

      <div className="mb-4 h-6 w-40 animate-pulse rounded bg-muted" />

      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div className="rounded-lg border bg-card p-4" key={i}>
            <div className="mb-2 h-4 w-36 animate-pulse rounded bg-muted" />
            <div className="mb-2 h-5 w-64 animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function UserProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <Suspense fallback={<ProfileSkeleton />}>{children}</Suspense>
}

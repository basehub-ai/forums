import { Suspense } from "react";

function ProfileSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-8 flex items-center gap-4">
        <div className="bg-muted h-16 w-16 animate-pulse rounded-full" />
        <div className="space-y-2">
          <div className="bg-muted h-7 w-48 animate-pulse rounded" />
          <div className="bg-muted h-4 w-32 animate-pulse rounded" />
        </div>
      </div>

      <div className="bg-muted mb-4 h-6 w-40 animate-pulse rounded" />

      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div className="bg-card rounded-lg border p-4" key={i}>
            <div className="bg-muted mb-2 h-4 w-36 animate-pulse rounded" />
            <div className="bg-muted mb-2 h-5 w-64 animate-pulse rounded" />
            <div className="bg-muted h-4 w-full animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function UserProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Suspense fallback={<ProfileSkeleton />}>{children}</Suspense>;
}

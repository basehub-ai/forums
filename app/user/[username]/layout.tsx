import { Suspense } from "react"
import { ProfileSkeleton } from "@/components/profile-skeleton"

export default function UserProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <Suspense fallback={<ProfileSkeleton />}>{children}</Suspense>
}

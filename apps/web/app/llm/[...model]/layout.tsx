import { Suspense } from "react"
import { ProfileSkeleton } from "@/components/profile-skeleton"

export default function LlmProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <Suspense fallback={<ProfileSkeleton />}>{children}</Suspense>
}

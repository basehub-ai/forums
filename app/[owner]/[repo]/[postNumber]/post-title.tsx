"use client"

import { usePostMetadata } from "./post-metadata-context"

export function PostTitle() {
  const { title } = usePostMetadata()

  if (!title) {
    return (
      <h1 className="relative overflow-hidden font-medium text-2xl text-muted-foreground">
        <span>Generating title...</span>
        <span className="-translate-x-full absolute inset-0 animate-[shimmer_2s_infinite] bg-linear-to-r from-transparent via-white/20 to-transparent" />
      </h1>
    )
  }

  return <h1 className="font-medium text-2xl">{title}</h1>
}

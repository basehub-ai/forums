"use client";

import { usePostMetadata } from "./post-metadata-context";

export function PostTitle() {
  const { title } = usePostMetadata();

  if (!title) {
    return (
      <h1 className="text-muted-foreground relative overflow-hidden text-3xl font-medium">
        <span>Generating title...</span>
        <span className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-linear-to-r from-transparent via-white/20 to-transparent" />
      </h1>
    );
  }

  return <h1 className="text-3xl font-medium">{title}</h1>;
}

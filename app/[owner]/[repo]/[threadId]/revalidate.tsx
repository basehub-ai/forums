"use server"

import { updateTag } from "next/cache"

// biome-ignore lint/suspicious/useAwait: .
export async function revalidateThread({ threadId }: { threadId: string }) {
  updateTag(`thread:${threadId}`)
}

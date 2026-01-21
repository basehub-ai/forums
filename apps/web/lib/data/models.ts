import { asc, eq } from "drizzle-orm"
import { cacheTag } from "next/cache"
import { db } from "@/lib/db/client"
import { llmUsers } from "@/lib/db/schema"

export async function getModelsForPicker() {
  "use cache"
  cacheTag("models-list")

  return db
    .select()
    .from(llmUsers)
    .where(eq(llmUsers.isInModelPicker, true))
    .orderBy(asc(llmUsers.name))
}

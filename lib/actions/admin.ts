"use server";

import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { llmUsers } from "@/lib/db/schema";

async function assertAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!isAdmin(session?.user)) {
    throw new Error("Unauthorized");
  }
}

export async function createLlmUser(data: {
  name: string;
  model: string;
  provider: string;
  image?: string;
}) {
  await assertAdmin();

  await db.insert(llmUsers).values({
    id: `llm_${nanoid()}`,
    name: data.name,
    model: data.model,
    provider: data.provider,
    image: data.image,
    isDefault: false,
    isInModelPicker: true,
    createdAt: Date.now(),
  });

  revalidatePath("/admin/llm-users");
}

export async function updateLlmUser(
  id: string,
  data: {
    name?: string;
    model?: string;
    provider?: string;
    image?: string;
    isInModelPicker?: boolean;
  },
) {
  await assertAdmin();

  await db.update(llmUsers).set(data).where(eq(llmUsers.id, id));

  revalidatePath("/admin/llm-users");
}

export async function setDefaultLlmUser(id: string) {
  await assertAdmin();

  await db.update(llmUsers).set({ isDefault: false });
  await db.update(llmUsers).set({ isDefault: true }).where(eq(llmUsers.id, id));

  revalidatePath("/admin/llm-users");
}

export async function deleteLlmUser(id: string) {
  await assertAdmin();

  await db.delete(llmUsers).where(eq(llmUsers.id, id));

  revalidatePath("/admin/llm-users");
}

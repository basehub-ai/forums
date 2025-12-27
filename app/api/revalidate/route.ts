import { revalidatePath, revalidateTag } from "next/cache"
import { z } from "zod"

export const POST = async (request: Request) => {
  const { secret, paths, tags } = z
    .object({
      secret: z.string(),
      paths: z.string().array(),
      tags: z.string().array().optional(),
    })
    .parse(await request.json())

  if (secret !== process.env.REVALIDATE_SECRET) {
    return Response.json({ error: "Invalid secret" }, { status: 401 })
  }

  for (const path of paths) {
    revalidatePath(path)
  }
  for (const tag of tags ?? []) {
    revalidateTag(tag, "max")
  }

  return Response.json({ ok: true })
}

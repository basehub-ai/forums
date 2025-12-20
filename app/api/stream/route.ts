import { createUIMessageStreamResponse } from "ai";
import { eq } from "drizzle-orm";
import { getRun } from "workflow/api";
import { db } from "@/lib/db/client";
import { comments } from "@/lib/db/schema";

async function getStream(commentId: string) {
  const [comment] = await db
    .select()
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1);

  if (!(comment?.runId && comment?.streamId)) {
    return null;
  }

  return createUIMessageStreamResponse({
    stream: getRun(comment.runId).getReadable({ namespace: comment.streamId }),
  });
}

export async function GET(req: Request) {
  const commentId = req.headers.get("x-comment-id");

  if (!commentId) {
    return new Response("Missing commentId", { status: 400 });
  }

  const response = await getStream(commentId);
  return response ?? new Response(null, { status: 404 });
}

export async function POST(req: Request) {
  const commentId = req.headers.get("x-comment-id");

  if (!commentId) {
    return new Response("Missing commentId", { status: 400 });
  }

  const response = await getStream(commentId);
  return response ?? new Response(null, { status: 404 });
}

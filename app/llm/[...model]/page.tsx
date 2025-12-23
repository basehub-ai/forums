import { db } from "@/lib/db/client";
import { comments, llmUsers } from "@/lib/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { cacheLife } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";

export const generateStaticParams = async () => {
  const allLlmUsers = await db.select().from(llmUsers);
  return allLlmUsers.map((u) => ({ id: u.id }));
};

export default async function LlmProfilePage({
  params,
}: {
  params: Promise<{ model: string[] }>;
}) {
  "use cache";
  cacheLife("minutes");
  const { model: modelSplit } = await params;
  const model = modelSplit.join("/");

  const [llmUser] = await db
    .select()
    .from(llmUsers)
    .where(eq(llmUsers.model, model))
    .limit(1);

  if (!llmUser) {
    notFound();
  }

  const recentComments = await db
    .select({
      id: comments.id,
      postId: comments.postId,
      content: comments.content,
      createdAt: comments.createdAt,
      postTitle: sql<string | null>`(
        SELECT title FROM posts WHERE posts.id = ${comments.postId}
      )`,
      postNumber: sql<number>`(
        SELECT number FROM posts WHERE posts.id = ${comments.postId}
      )`,
      postOwner: sql<string>`(
        SELECT owner FROM posts WHERE posts.id = ${comments.postId}
      )`,
      postRepo: sql<string>`(
        SELECT repo FROM posts WHERE posts.id = ${comments.postId}
      )`,
    })
    .from(comments)
    .where(eq(comments.authorId, llmUser.id))
    .orderBy(desc(comments.createdAt))
    .limit(20);

  const totalComments = await db
    .select({ count: sql<number>`count(*)` })
    .from(comments)
    .where(eq(comments.authorId, llmUser.id))
    .then((r) => r[0]?.count ?? 0);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-8 flex items-center gap-4">
        {!!llmUser.image && (
          <img
            alt={llmUser.name}
            className="h-16 w-16 rounded-full"
            src={llmUser.image}
          />
        )}
        <div>
          <h1 className="text-2xl font-bold">{llmUser.name}</h1>
          <p className="text-muted-foreground text-sm">
            {llmUser.provider} &middot; {totalComments} responses
          </p>
          {!!llmUser.deprecatedAt && (
            <p className="mt-1 text-sm text-amber-600">
              This model was deprecated on{" "}
              {new Date(llmUser.deprecatedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      <h2 className="mb-4 text-lg font-semibold">Recent Responses</h2>

      {recentComments.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No responses yet from this model.
        </p>
      ) : (
        <div className="space-y-4">
          {recentComments.map((comment) => {
            const preview = comment.content[0]?.parts
              .filter(
                (p): p is { type: "text"; text: string } => p.type === "text",
              )
              .map((p) => p.text)
              .join(" ")
              .slice(0, 200);

            return (
              <Link
                className="bg-card hover:bg-accent block rounded-lg border p-4 transition-colors"
                href={`/${comment.postOwner}/${comment.postRepo}/${comment.postNumber}`}
                key={comment.id}
              >
                <div className="text-muted-foreground mb-1 text-sm">
                  {comment.postOwner}/{comment.postRepo} #{comment.postNumber}
                </div>
                <h3 className="font-medium">
                  {comment.postTitle ?? `Post #${comment.postNumber}`}
                </h3>
                {!!preview && (
                  <p className="text-muted-foreground mt-1 text-sm">
                    {preview}
                    {preview.length >= 200 && "..."}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

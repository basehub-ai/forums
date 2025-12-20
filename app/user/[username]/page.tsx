import { desc, eq, sql } from "drizzle-orm";
import { cacheLife } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import { gitHubUserLoader } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { comments } from "@/lib/db/schema";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  "use cache";
  cacheLife("minutes");
  const { username } = await params;

  const user = await gitHubUserLoader.load(username);

  if (!user) {
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
    .where(eq(comments.authorUsername, username))
    .orderBy(desc(comments.createdAt))
    .limit(20);

  const totalComments = await db
    .select({ count: sql<number>`count(*)` })
    .from(comments)
    .where(eq(comments.authorUsername, username))
    .then((r) => r[0]?.count ?? 0);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center gap-4">
        <img
          alt={user.name ?? username}
          className="h-16 w-16 rounded-full"
          src={user.image}
        />
        <div>
          <h1 className="text-2xl font-bold">{user.name ?? username}</h1>
          <p className="text-muted-foreground text-sm">
            @{username} &middot; {totalComments} comments
          </p>
        </div>
      </div>

      <h2 className="mb-4 text-lg font-semibold">Recent Comments</h2>

      {recentComments.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No comments yet from this user.
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

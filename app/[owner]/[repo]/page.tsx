import { and, desc, eq, sql } from "drizzle-orm";
import { cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { categories, llmUsers, posts } from "@/lib/db/schema";
import { ActivePosts } from "./active-posts";
import { NewPostComposer } from "./new-post-composer";

export const generateStaticParams = async () => {
  const repos = (
    await db
      .selectDistinctOn([posts.owner, posts.repo], {
        owner: posts.owner,
        repo: posts.repo,
      })
      .from(posts)
  ).map((r) => ({ owner: r.owner, repo: r.repo }));

  return repos.length > 0 ? repos : [{ owner: "basehub-ai", repo: "forums" }];
};

export default async function RepoPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  "use cache";

  const { owner, repo } = await params;
  cacheTag(`repo:${owner}:${repo}`);

  const [repoPosts, repoCategories, allLlmUsers, repoData] = await Promise.all([
    db
      .select({
        id: posts.id,
        number: posts.number,
        title: posts.title,
        categoryId: posts.categoryId,
        authorId: posts.authorId,
        rootCommentId: posts.rootCommentId,
        createdAt: posts.createdAt,
        commentCount: sql<number>`(
          SELECT COUNT(*) FROM comments WHERE comments.post_id = ${posts.id}
        )`.as("comment_count"),
        reactionCount: sql<number>`(
          SELECT COUNT(*) FROM reactions
          WHERE reactions.comment_id = ${posts.rootCommentId}
        )`.as("reaction_count"),
      })
      .from(posts)
      .where(and(eq(posts.owner, owner), eq(posts.repo, repo)))
      .orderBy(desc(posts.createdAt)),
    db
      .select()
      .from(categories)
      .where(and(eq(categories.owner, owner), eq(categories.repo, repo))),
    db.select().from(llmUsers).where(eq(llmUsers.isInModelPicker, true)),
    fetch(`https://api.github.com/repos/${owner}/${repo}`).then(async (res) => {
      if (!res.ok || res.status === 404) {
        return null;
      }
      return res.json();
    }),
  ]);

  if (!repoData) {
    return notFound();
  }

  const categoriesById = Object.fromEntries(
    repoCategories.map((c) => [c.id, c]),
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">
        {owner}/{repo}
      </h1>

      <div className="mb-8">
        <NewPostComposer
          askingOptions={[
            ...allLlmUsers.map((u) => ({
              id: u.id,
              name: u.name,
              image: u.image,
              isDefault: u.isDefault,
            })),
            { id: "human", name: "Human only" },
          ]}
          owner={owner}
          repo={repo}
        />
      </div>

      <ActivePosts
        categoriesById={categoriesById}
        owner={owner}
        posts={repoPosts}
        repo={repo}
      />
    </div>
  );
}

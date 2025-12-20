import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { categories, posts } from "@/lib/db/schema";
import { typesense } from "@/lib/typesense";

export async function POST(request: Request) {
  const body = await request.json();
  const {
    query,
    owner,
    repo,
    categoryId,
    page = 1,
    perPage = 20,
  } = body as {
    query: string;
    owner: string;
    repo: string;
    categoryId?: string;
    page?: number;
    perPage?: number;
  };

  if (!query?.trim()) {
    return Response.json({ posts: [], totalFound: 0 });
  }

  let filterBy = `owner:=${owner} && repo:=${repo}`;
  if (categoryId) {
    filterBy += ` && categoryId:=${categoryId}`;
  }

  const searchResult = await typesense
    .collections("comments")
    .documents()
    .search({
      q: query,
      query_by: "text",
      filter_by: filterBy,
      group_by: ["postId"],
      group_limit: 1,
      page,
      per_page: perPage,
    });

  const postIds =
    searchResult.grouped_hits?.map((g) => g.group_key[0] as string) ?? [];

  if (postIds.length === 0) {
    return Response.json({ posts: [], totalFound: searchResult.found ?? 0 });
  }

  const matchedPosts = await db
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
    .where(
      and(
        eq(posts.owner, owner),
        eq(posts.repo, repo),
        inArray(posts.id, postIds),
      ),
    );

  const repoCategories = await db
    .select()
    .from(categories)
    .where(and(eq(categories.owner, owner), eq(categories.repo, repo)));

  const categoriesById = Object.fromEntries(
    repoCategories.map((c) => [c.id, c]),
  );

  const postsById = Object.fromEntries(matchedPosts.map((p) => [p.id, p]));
  const orderedPosts = postIds
    .map((id) => postsById[id])
    .filter(Boolean)
    .map((post) => ({
      ...post,
      category: post.categoryId ? categoriesById[post.categoryId] : null,
    }));

  return Response.json({
    posts: orderedPosts,
    totalFound: searchResult.found ?? 0,
  });
}

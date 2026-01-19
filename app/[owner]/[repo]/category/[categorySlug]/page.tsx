import { and, desc, eq, sql } from "drizzle-orm"
import type { Metadata } from "next"
import { cacheTag } from "next/cache"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Container } from "@/components/container"
import { Subtitle, Title } from "@/components/typography"
import {
  categorySlugify,
  getCategoryBySlug,
  getCategoryPostCount,
} from "@/lib/data/categories"
import { getGithubRepo } from "@/lib/data/github"
import { getModelsForPicker } from "@/lib/data/models"
import { db } from "@/lib/db/client"
import { categories, comments, posts } from "@/lib/db/schema"
import { getSiteOrigin } from "@/lib/utils"
import { RepoContent } from "../../repo-content"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ owner: string; repo: string; categorySlug: string }>
}): Promise<Metadata> {
  const { owner, repo, categorySlug } = await params
  const origin = getSiteOrigin()
  const category = await getCategoryBySlug(owner, repo, categorySlug)

  if (!category) {
    return {}
  }

  const postCount = await getCategoryPostCount(owner, repo, category.id)
  const title = `${category.title} — ${owner}/${repo}`
  const description =
    postCount > 0
      ? `There are ${postCount} posts categorized.`
      : "No posts yet!"

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        `${origin}/api/og/category?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&categorySlug=${encodeURIComponent(categorySlug)}`,
      ],
    },
  }
}

export async function generateStaticParams() {
  const allCategories = await db.select().from(categories)

  return allCategories.map((category) => ({
    owner: category.owner,
    repo: category.repo,
    categorySlug: categorySlugify(category.title),
  }))
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string; categorySlug: string }>
}) {
  "use cache"

  const { owner, repo, categorySlug } = await params
  cacheTag(`category:${categorySlug}`)

  const [category, allLlmUsers, repoData] = await Promise.all([
    getCategoryBySlug(owner, repo, categorySlug),
    getModelsForPicker(),
    getGithubRepo(owner, repo),
  ])

  if (!category) {
    return notFound()
  }

  if (!repoData) {
    return notFound()
  }

  const categoryPosts = await db
    .select({
      id: posts.id,
      number: posts.number,
      title: posts.title,
      categoryId: posts.categoryId,
      authorId: posts.authorId,
      authorUsername: comments.authorUsername,
      rootCommentId: posts.rootCommentId,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      pinned: posts.pinned,
      commentCount: sql<number>`(
        SELECT COUNT(*) FROM comments WHERE comments.post_id = ${posts.id}
      )`.as("comment_count"),
      reactionCount: sql<number>`(
        SELECT COUNT(*) FROM reactions
        WHERE reactions.comment_id = ${posts.rootCommentId}
      )`.as("reaction_count"),
    })
    .from(posts)
    .leftJoin(comments, eq(posts.rootCommentId, comments.id))
    .where(
      and(
        eq(posts.owner, owner),
        eq(posts.repo, repo),
        eq(posts.categoryId, category.id)
      )
    )
    .orderBy(desc(posts.updatedAt))

  const pinnedPosts = categoryPosts.filter((p) => p.pinned)
  const regularPosts = categoryPosts.filter((p) => !p.pinned)

  const categoriesById = { [category.id]: category }

  return (
    <Container>
      <Link
        className="flex w-max text-sm hover:underline"
        href={`/${owner}/${repo}`}
      >
        <Subtitle>
          {owner}/{repo}
        </Subtitle>
      </Link>

      <Title className="mt-1 mb-8">{category.title}</Title>

      <RepoContent
        askingOptions={[
          ...allLlmUsers
            .map((u) => ({
              id: u.id,
              name: u.name,
              image: u.image,
              isDefault: u.isDefault,
              isProModel: u.billing_category === "pro",
              provider: u.provider,
            }))
            .sort((a, b) => a.name.localeCompare(b.name)),
          { id: "human", name: "Human only" },
        ]}
        categoriesById={categoriesById}
        categoryId={category.id}
        defaultBranch={repoData.default_branch}
        owner={owner}
        pinnedPosts={pinnedPosts}
        posts={regularPosts}
        repo={repo}
      />
    </Container>
  )
}

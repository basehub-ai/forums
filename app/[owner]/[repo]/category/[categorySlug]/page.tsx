import { and, desc, eq, sql } from "drizzle-orm"
import type { Metadata } from "next"
import { cacheTag } from "next/cache"
import Link from "next/link"
import { notFound } from "next/navigation"
import slugify from "slugify"
import { Container } from "@/components/container"
import { Subtitle, Title } from "@/components/typography"
import { db } from "@/lib/db/client"
import { categories, comments, llmUsers, posts } from "@/lib/db/schema"
import { getSiteOrigin } from "@/lib/utils"
import { ActivePosts } from "../../active-posts"
import { NewPostComposer } from "../../new-post-composer"

function categorySlugify(title: string) {
  return slugify(title, { lower: true, strict: true })
}

async function getCategoryBySlug(owner: string, repo: string, slug: string) {
  const repoCategories = await db
    .select()
    .from(categories)
    .where(and(eq(categories.owner, owner), eq(categories.repo, repo)))

  return repoCategories.find((c) => categorySlugify(c.title) === slug)
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ owner: string; repo: string; categorySlug: string }>
}): Promise<Metadata> {
  const { owner, repo, categorySlug } = await params
  const origin = getSiteOrigin()

  return {
    openGraph: {
      images: [
        `${origin}/api/og/category?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&categorySlug=${encodeURIComponent(categorySlug)}`,
      ],
    },
  }
}

export const generateStaticParams = async () => {
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
    db.select().from(llmUsers).where(eq(llmUsers.isInModelPicker, true)),
    fetch(`https://api.github.com/repos/${owner}/${repo}`).then(async (res) => {
      if (!res.ok || res.status === 404) {
        return null
      }
      return res.json()
    }),
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
    .orderBy(desc(posts.createdAt))

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

      <Title className="mt-1 mb-8">
        {category.emoji} {category.title}
      </Title>

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
        posts={categoryPosts}
        repo={repo}
      />
    </Container>
  )
}

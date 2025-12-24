import { and, desc, eq, sql } from "drizzle-orm"
import { ArrowLeftIcon } from "lucide-react"
import { cacheTag } from "next/cache"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { db } from "@/lib/db/client"
import { categories, llmUsers, posts } from "@/lib/db/schema"
import { getSiteOrigin } from "@/lib/utils"
import { ActivePosts } from "../../active-posts"
import { NewPostComposer } from "../../new-post-composer"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ owner: string; repo: string; categoryId: string }>
}): Promise<Metadata> {
  const { owner, repo, categoryId } = await params
  const origin = getSiteOrigin()

  return {
    openGraph: {
      images: [
        `${origin}/api/og/category?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&categoryId=${encodeURIComponent(categoryId)}`,
      ],
    },
  }
}

export const generateStaticParams = async () => {
  const allCategories = await db.select().from(categories)

  return allCategories.map((category) => ({
    owner: category.owner,
    repo: category.repo,
    categoryId: category.id,
  }))
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string; categoryId: string }>
}) {
  "use cache"

  const { owner, repo, categoryId } = await params
  cacheTag(`category:${categoryId}`)

  const [category, categoryPosts, allLlmUsers, repoData] = await Promise.all([
    db
      .select()
      .from(categories)
      .where(eq(categories.id, categoryId))
      .limit(1)
      .then((r) => r[0]),
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
      .where(
        and(
          eq(posts.owner, owner),
          eq(posts.repo, repo),
          eq(posts.categoryId, categoryId)
        )
      )
      .orderBy(desc(posts.createdAt)),
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

  if (category.owner !== owner || category.repo !== repo) {
    return notFound()
  }

  const categoriesById = { [category.id]: category }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-6">
        <Link
          className="flex items-center gap-1 text-muted-foreground text-sm hover:underline"
          href={`/${owner}/${repo}`}
        >
          <ArrowLeftIcon size={14} /> Back to {owner}/{repo}
        </Link>
      </div>

      <h1 className="mb-6 font-bold text-2xl">
        {category.emoji} {category.title}
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
        posts={categoryPosts}
        repo={repo}
      />
    </div>
  )
}

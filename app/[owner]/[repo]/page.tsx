import { and, desc, eq, sql } from "drizzle-orm"
import { GithubIcon, LinkIcon, StarIcon } from "lucide-react"
import type { Metadata } from "next"
import { cacheTag } from "next/cache"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Container } from "@/components/container"
import { Subtitle, Title } from "@/components/typography"
import { getGithubRepo } from "@/lib/data/github"
import { db } from "@/lib/db/client"
import { categories, comments, llmUsers, posts } from "@/lib/db/schema"
import { formatCompactNumber, getSiteOrigin } from "@/lib/utils"
import { ActivePosts } from "./active-posts"
import { NewPostComposer } from "./new-post-composer"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>
}): Promise<Metadata> {
  const { owner, repo } = await params
  const origin = getSiteOrigin()
  const repoData = await getGithubRepo(owner, repo)

  const title = `${owner}/${repo} — Forums`
  const description = repoData?.description
    ? `Forum of ${owner}/${repo}. ${repoData.description}`
    : `Forum of ${owner}/${repo}.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        `${origin}/api/og/repo?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`,
      ],
    },
  }
}

export const generateStaticParams = async () => {
  const repos = (
    await db
      .selectDistinctOn([posts.owner, posts.repo], {
        owner: posts.owner,
        repo: posts.repo,
      })
      .from(posts)
  ).map((r) => ({ owner: r.owner, repo: r.repo }))

  return repos.length > 0 ? repos : [{ owner: "basehub-ai", repo: "forums" }]
}

export default async function RepoPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>
}) {
  "use cache"

  const { owner, repo } = await params
  cacheTag(`repo:${owner}:${repo}`)

  const [repoPosts, repoCategories, allLlmUsers, repoData] = await Promise.all([
    db
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
      .where(and(eq(posts.owner, owner), eq(posts.repo, repo)))
      .orderBy(desc(posts.createdAt)),
    db
      .select()
      .from(categories)
      .where(and(eq(categories.owner, owner), eq(categories.repo, repo))),
    db.select().from(llmUsers).where(eq(llmUsers.isInModelPicker, true)),
    getGithubRepo(owner, repo),
  ])

  if (!repoData) {
    return notFound()
  }

  const categoriesById = Object.fromEntries(
    repoCategories.map((c) => [c.id, c])
  )

  return (
    <Container>
      <div className="mb-8">
        <Title>
          {owner}/{repo}
        </Title>
        {!!repoData.description && (
          <Subtitle className="mt-2">{repoData.description}</Subtitle>
        )}
        <div className="mt-2 flex items-center gap-4 text-sm">
          <Link
            className="flex items-center gap-1 hover:underline"
            href={`https://github.com/${owner}/${repo}`}
            target="_blank"
          >
            <GithubIcon className="h-3.5 w-3.5" />
            {owner}/{repo}
          </Link>
          <span className="flex items-center gap-1">
            <StarIcon className="h-3.5 w-3.5" />
            {formatCompactNumber(repoData.stargazers_count)}
          </span>
          {!!repoData.homepage && (
            <Link
              className="flex items-center gap-1 hover:underline"
              href={repoData.homepage}
              target="_blank"
            >
              <LinkIcon className="h-3.5 w-3.5" />
              {new URL(repoData.homepage).host}
            </Link>
          )}
        </div>
      </div>

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
    </Container>
  )
}

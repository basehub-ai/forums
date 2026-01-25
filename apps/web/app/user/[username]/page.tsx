import { desc, eq, sql } from "drizzle-orm"
import { AsteriskIcon } from "lucide-react"
import type { Metadata } from "next"
import { cacheTag } from "next/cache"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Container } from "@/components/container"
import {
  List,
  ListItem,
  Subtitle,
  TableCellText,
  TableColumnTitle,
  Title,
} from "@/components/typography"
import { gitHubUserLoader } from "@/lib/auth"
import { db } from "@/lib/db/client"
import { comments } from "@/lib/db/schema"
import {
  formatCompactNumber,
  formatRelativeTime,
  getSiteOrigin,
} from "@/lib/utils"

export async function generateStaticParams() {
  const usernames = await db
    .selectDistinct({ username: comments.authorUsername })
    .from(comments)
    .where(sql`${comments.authorUsername} IS NOT NULL`)

  return usernames
    .filter((u): u is { username: string } => u.username !== null)
    .map((u) => ({ username: u.username }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>
}): Promise<Metadata> {
  const { username } = await params
  const origin = getSiteOrigin()

  const [githubUser, stats] = await Promise.all([
    gitHubUserLoader.load(username),
    db
      .execute<{ commentCount: number; repoCount: number }>(sql`
        SELECT
          count(*) as "commentCount",
          count(distinct p.owner || '/' || p.repo) as "repoCount"
        FROM comments c
        JOIN posts p ON p.id = c.post_id
        WHERE c.author_username = ${username}
      `)
      .then((r) => r[0] ?? { commentCount: 0, repoCount: 0 }),
  ])

  const name = githubUser?.name ?? username
  const title = `${name} — Forums`
  const description = `${name} has ${stats.commentCount} comments in over ${stats.repoCount} repositories. Join Forums; get to the source!`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [`${origin}/api/og/user?username=${username}`],
    },
  }
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  "use cache"
  const { username } = await params
  cacheTag(`user:${username}`)

  const githubUser = await gitHubUserLoader.load(username)

  if (!githubUser) {
    notFound()
  }

  const now = Date.now()

  const recentRepositories = await db.execute<{
    owner: string
    repo: string
    lastActive: number
    postCount: number
  }>(sql`
      WITH user_repos AS (
        SELECT DISTINCT p.owner, p.repo, MAX(c.created_at) as last_active
        FROM comments c
        JOIN posts p ON p.id = c.post_id
        WHERE c.author_username = ${username}
        GROUP BY p.owner, p.repo

        UNION

        SELECT DISTINCT p.owner, p.repo, MAX(p.created_at) as last_active
        FROM posts p
        JOIN "user" u ON u.id = p.author_id
        WHERE u.username = ${username}
        GROUP BY p.owner, p.repo

        UNION

        SELECT DISTINCT p.owner, p.repo, MAX(r.created_at) as last_active
        FROM reactions r
        JOIN comments c ON c.id = r.comment_id
        JOIN posts p ON p.id = c.post_id
        JOIN "user" u ON u.id = r.user_id
        WHERE u.username = ${username}
        GROUP BY p.owner, p.repo
      ),
      aggregated AS (
        SELECT owner, repo, MAX(last_active) as last_active
        FROM user_repos
        GROUP BY owner, repo
      )
      SELECT
        a.owner,
        a.repo,
        a.last_active as "lastActive",
        (SELECT COUNT(*) FROM posts WHERE posts.owner = a.owner AND posts.repo = a.repo) as "postCount"
      FROM aggregated a
      ORDER BY a.last_active DESC
      LIMIT 10
    `)

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
    .limit(20)

  const totalComments = await db
    .select({ count: sql<number>`count(*)` })
    .from(comments)
    .where(eq(comments.authorUsername, username))
    .then((r) => r[0]?.count ?? 0)

  return (
    <Container>
      <div className="mb-8 flex items-center gap-2.5">
        <Image
          alt={githubUser.name ?? username}
          className="h-14 w-14 rounded-full"
          height={56}
          src={githubUser.image}
          width={56}
        />
        <div className="flex flex-col">
          <Title>{githubUser.name ?? username}</Title>
          <Subtitle className="mt-0.5 text-dim">
            <a
              className="hover:underline"
              href={`https://github.com/${username}`}
              rel="noopener"
              target="_blank"
            >
              @{username}
            </a>{" "}
            - {totalComments} comments
          </Subtitle>
        </div>
      </div>

      <div className="-mx-4 overflow-x-auto [--col-w-1:67px] [--col-w-2:131px] sm:-mx-2 sm:px-2">
        <div className="min-w-fit px-4 sm:px-0">
          <div className="relative min-w-100">
            <hr className="divider-md absolute top-1/2 left-0 w-full -translate-y-1/2 border-0 opacity-40" />
            <div className="relative z-10 flex w-full">
              <div className="flex grow">
                <TableColumnTitle className="px-0 pr-2">
                  Recent Repositories
                </TableColumnTitle>
              </div>
              <div className="flex shrink-0">
                <TableColumnTitle className="mr-13.5">Posts</TableColumnTitle>
                <TableColumnTitle className="px-0 pl-2">
                  Last Active
                </TableColumnTitle>
              </div>
            </div>
          </div>

          {recentRepositories.length > 0 ? (
            <List className="mt-2 min-w-100 pb-2">
              {recentRepositories.map((repo) => (
                <ListItem key={`${repo.owner}/${repo.repo}`}>
                  <Link
                    className="group mr-3 flex grow items-center gap-1 overflow-hidden text-dim hover:underline"
                    href={`/${repo.owner}/${repo.repo}`}
                  >
                    <AsteriskIcon className="mt-0.5 text-faint" size={16} />
                    <span className="whitespace-nowrap leading-none group-hover:text-bright">
                      {repo.owner}/{repo.repo}
                    </span>
                  </Link>
                  <div className="flex shrink-0">
                    <TableCellText className="w-(--col-w-1)">
                      {formatCompactNumber(Number(repo.postCount))}
                    </TableCellText>
                    <TableCellText className="w-(--col-w-2) text-end">
                      {formatRelativeTime(Number(repo.lastActive), now)}
                    </TableCellText>
                  </div>
                </ListItem>
              ))}
            </List>
          ) : (
            <p className="mt-4 text-muted">No repositories yet.</p>
          )}
        </div>
      </div>

      <div className="relative mt-10 mb-2">
        <hr className="divider-md absolute top-1/2 left-0 w-full -translate-y-1/2 border-0 opacity-40" />
        <h2 className="relative z-10 w-fit bg-background pr-2 font-medium text-sm uppercase">
          Recent Comments
        </h2>
      </div>

      {recentComments.length === 0 ? (
        <p className="text-dim text-sm">No comments yet from this user.</p>
      ) : (
        <List>
          {recentComments.map((comment) => {
            const preview = comment.content[0]?.parts
              .filter(
                (p): p is { type: "text"; text: string } => p.type === "text"
              )
              .map((p) => p.text)
              .join(" ")
              .slice(0, 200)

            return (
              <ListItem key={comment.id}>
                <Link
                  className="group flex grow items-start gap-1 overflow-hidden"
                  href={`/${comment.postOwner}/${comment.postRepo}/${comment.postNumber}`}
                >
                  <AsteriskIcon
                    className="mt-0.5 shrink-0 text-faint"
                    size={16}
                  />
                  <div className="min-w-0">
                    <span className="text-dim group-hover:text-bright group-hover:underline">
                      {comment.postTitle || `Post #${comment.postNumber}`}
                    </span>
                    <span className="ml-2 text-faint text-sm">
                      {comment.postOwner}/{comment.postRepo}
                    </span>
                    {!!preview && (
                      <p className="mt-0.5 truncate text-faint text-sm">
                        {preview}
                        {preview.length >= 200 && "..."}
                      </p>
                    )}
                  </div>
                </Link>
              </ListItem>
            )
          })}
        </List>
      )}
    </Container>
  )
}

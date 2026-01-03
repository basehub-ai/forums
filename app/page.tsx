import { AsteriskIcon, SearchIcon } from "lucide-react"
import { cacheLife } from "next/cache"
import Link from "next/link"
import { Container } from "@/components/container"
import {
  List,
  ListItem,
  Subtitle,
  TableCellText,
  TableColumnTitle,
  Title,
} from "@/components/typography"
import { getTopRepositories } from "@/lib/top-repos"
import { formatCompactNumber, formatRelativeTime } from "@/lib/utils"

export default async function Home() {
  "use cache"
  cacheLife("minutes")

  const topRepos = await getTopRepositories(30)

  return (
    <Container>
      <Title>Get to the source!</Title>
      <Subtitle className="mt-2">
        Ask a question inside any GitHub Repository. AI Agents will clone and
        read and grep the source code to provide the best answer.
      </Subtitle>
      <form className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="relative flex w-full items-center sm:w-sm">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-accent"
            size={18}
          />
          <input
            className="no-focus h-9 w-full bg-accent/5 pr-2 pl-8 font-medium text-accent text-base outline-dashed outline-2 outline-accent -outline-offset-1 placeholder:text-accent hover:bg-accent/10 focus:outline-solid"
            placeholder="Search or paste a repo URL"
          />
        </div>
        <div className="text-sm">
          <span className="text-faint">or </span>
          <Link
            className="text-muted underline hover:text-bright"
            href="/lucky"
          >
            I'm feeling lucky
          </Link>
        </div>
      </form>
      <div className="-mx-4 mt-10 overflow-x-auto [--col-w-1:89px] [--col-w-2:67px] [--col-w-3:131px] sm:-mx-2 sm:px-2">
        <div className="min-w-fit px-4 sm:px-0">
          <div className="relative min-w-120">
            <hr className="divider-md absolute top-1/2 left-0 w-full -translate-y-1/2 border-0" />
            <div className="relative z-10 flex w-full">
              <div className="flex grow">
                <TableColumnTitle className="px-0 pr-2">
                  Top Repositories
                </TableColumnTitle>
              </div>
              <div className="flex shrink-0">
                <TableColumnTitle className="mr-8">Stars</TableColumnTitle>
                <TableColumnTitle className="mr-13.5">Posts</TableColumnTitle>
                <TableColumnTitle className="px-0 pl-2">
                  Last Active
                </TableColumnTitle>
              </div>
            </div>
          </div>
          {topRepos.length > 0 ? (
            <List className="mt-2 min-w-120 pb-2">
              {topRepos.map((repo) => {
                return (
                  <ListItem key={repo.name}>
                    <Link
                      className="group mr-3 flex grow items-center gap-1 text-dim hover:underline"
                      href={repo.name}
                    >
                      <AsteriskIcon className="mt-0.5 text-faint" size={16} />
                      <span className="whitespace-nowrap leading-none group-hover:text-bright">
                        {repo.name}
                      </span>
                    </Link>
                    <div className="flex shrink-0">
                      <TableCellText className="w-(--col-w-1)">
                        {formatCompactNumber(repo.stars)}
                      </TableCellText>
                      <TableCellText className="w-(--col-w-2)">
                        {formatCompactNumber(repo.posts)}
                      </TableCellText>
                      <TableCellText className="w-(--col-w-3) text-end">
                        {formatRelativeTime(repo.lastActive)}
                      </TableCellText>
                    </div>
                  </ListItem>
                )
              })}
            </List>
          ) : (
            <p className="mt-4 text-muted">
              No repositories yet. Search for a repo to get started!
            </p>
          )}
        </div>
      </div>
      <pre
        aria-hidden="true"
        className="mx-auto mt-10 w-fit overflow-x-auto text-muted text-xs leading-tight"
      >{`┌───────────────────┐
│  Ask a question   │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  Clone the repo   │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  Explore the code │
└─────────┬─────────┘
          │
          ▼
╔═══════════════════╗
║  Source-backed    ║
║      answer       ║
╚═══════════════════╝`}</pre>
    </Container>
  )
}

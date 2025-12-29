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
import { formatCompactNumber, formatRelativeTime } from "@/lib/utils"

export default async function Home() {
  "use cache"
  cacheLife("minutes")

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
            className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2 text-accent"
            size={18}
          />
          <input
            className="no-focus -outline-offset-1 h-9 w-full bg-accent/5 pr-2 pl-8 font-medium text-accent text-base outline-dashed outline-2 outline-accent placeholder:text-accent hover:bg-accent/10 focus:outline-solid"
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
      <div className="-mx-4 mt-10 overflow-x-auto px-4 sm:mx-0 sm:px-0 [--col-w-1:89px] [--col-w-2:67px] [--col-w-3:131px]">
        <div className="relative min-w-[480px]">
          <hr className="divider-md -translate-y-1/2 absolute top-1/2 left-0 w-full border-0" />
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
        <List className="mt-2 min-w-[480px] pb-2">
          {topRepos.map((repo) => {
            return (
              <ListItem key={repo.name}>
                <Link
                  className="group mr-3 flex grow items-center gap-1 text-dim hover:underline"
                  href={repo.name}
                >
                  <AsteriskIcon className="mt-0.5 text-faint" size={16} />
                  <span className="leading-none group-hover:text-bright">
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
      </div>
    </Container>
  )
}

const topRepos = [
  {
    name: "vercel/next.js",
    stars: 123_456,
    posts: 7890,
    lastActive: Date.now() - 2 * 60 * 1000,
  },
  {
    name: "facebook/react",
    stars: 98_765,
    posts: 6543,
    lastActive: Date.now() - 3 * 60 * 60 * 1000,
  },
  {
    name: "torvalds/linux",
    stars: 87_654,
    posts: 3210,
    lastActive: Date.now() - 2 * 60 * 60 * 1000 * 24,
  },
  {
    name: "microsoft/vscode",
    stars: 76_543,
    posts: 2109,
    lastActive: Date.now() - 5 * 60 * 60 * 1000 * 24,
  },
]

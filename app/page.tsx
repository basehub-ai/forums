import { AsteriskIcon, SearchIcon } from "lucide-react"
import { cacheLife } from "next/cache"
import Link from "next/link"
import { Container } from "@/components/container"
import { formatCompactNumber, formatRelativeTime } from "@/lib/utils"

export default async function Home() {
  "use cache"
  cacheLife("minutes")

  return (
    <Container>
      <h1 className="text-pretty font-bold text-bright text-lg tracking-normal underline">
        Get to the source!
      </h1>
      <p className="mt-2 text-pretty leading-[1.3]">
        Ask a question inside any GitHub Repository. AI Agents will clone and
        read and grep the source code to provide the best answer.
      </p>
      <form className="mt-6 flex items-center gap-4">
        <div className="relative flex w-sm items-center">
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
            I'm feeling lucky!
          </Link>
        </div>
      </form>
      <div className="mt-10 [--col-w-1:89px] [--col-w-2:67px] [--col-w-3:131px]">
        <div className="relative">
          <hr className="divider-md -translate-y-1/2 absolute top-1/2 left-0 w-full border-0" />
          <div className="relative z-10 flex w-full">
            <div className="flex grow">
              <p className="bg-background pr-2 font-medium text-sm uppercase">
                Top Repositories
              </p>
            </div>
            <div className="flex shrink-0">
              <span className="mr-8 bg-background px-2 font-medium text-sm uppercase">
                Stars
              </span>
              <span className="mr-13.5 bg-background px-2 font-medium text-sm uppercase">
                Posts
              </span>
              <span className="bg-background pl-2 font-medium text-sm uppercase">
                Last Active
              </span>
            </div>
          </div>
        </div>
        <div className="mt-2 flex flex-col gap-2.5">
          {topRepos.map((repo) => {
            return (
              <div className="flex" key={repo.name}>
                <Link
                  className="group mr-3 flex grow items-center gap-1 text-dim hover:underline"
                  href={repo.name}
                >
                  <AsteriskIcon className="mt-0.5 text-faint" size={16} />
                  <span className="leading-none group-hover:text-bright">
                    {repo.name}
                  </span>
                </Link>
                <div className="flex shrink-0 leading-none">
                  <div className="w-(--col-w-1)">
                    {formatCompactNumber(repo.stars)}
                  </div>
                  <div className="w-(--col-w-2)">
                    {formatCompactNumber(repo.posts)}
                  </div>
                  <div className="w-(--col-w-3) text-end">
                    {formatRelativeTime(repo.lastActive)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
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

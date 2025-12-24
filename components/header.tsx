import { headers } from "next/headers"
import Link from "next/link"
import { Suspense } from "react"
import { GlobalSearch } from "@/components/global-search"
import Logotype from "@/components/logotype"
import { auth } from "@/lib/auth"
import { SignInButton } from "./sign-in-button"
import { UserDropdown } from "./user-dropdown"

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-linear-to-b from-80% from-background via-92% via-background/40 to-transparent">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 pt-3 pb-6 lg:flex-nowrap">
        <div className="grid h-10 w-full grid-cols-3 items-center">
          <Link className="justify-self-start hover:opacity-80" href="/">
            <Logotype className="fill-foreground" />
          </Link>

          <Suspense>
            <div className="flex w-full max-w-md items-center justify-self-center">
              <GlobalSearch />
            </div>
          </Suspense>

          <div className="flex justify-self-end">
            <Suspense
              fallback={
                <div className="h-9 w-32 animate-pulse rounded-md bg-muted" />
              }
            >
              <User />
            </Suspense>
          </div>
        </div>
      </div>
    </header>
  )
}

const User = async () => {
  const data = await auth.api.getSession({ headers: await headers() })

  if (!data) {
    return <SignInButton />
  }

  return <UserDropdown {...data} />
}

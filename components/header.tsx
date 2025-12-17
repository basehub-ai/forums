import { headers } from "next/headers"
import Link from "next/link"
import { Suspense } from "react"
import Logotype from "@/components/logotype"
import { auth } from "@/lib/auth"
import { RepoSwitcher } from "./repo-switcher"
import { SignInButton } from "./sign-in-button"
import { UserDropdown } from "./user-dropdown"

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="container mx-auto flex h-14 items-center px-4">
        <Link className="flex-1 hover:opacity-80" href="/">
          <Logotype />
        </Link>

        <div className="-translate-x-1/2 absolute left-1/2">
          <Suspense>
            <RepoSwitcher />
          </Suspense>
        </div>

        <div className="flex flex-1 justify-end">
          <Suspense
            fallback={
              <div className="h-9 w-32 animate-pulse rounded-md bg-muted" />
            }
          >
            <User />
          </Suspense>
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

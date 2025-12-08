import { headers } from "next/headers"
import { Suspense } from "react"
import { auth } from "@/lib/auth"
import { RepoSwitcher } from "./repo-switcher"
import { SignInButton } from "./sign-in-button"
import { UserDropdown } from "./user-dropdown"

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="container mx-auto flex h-14 items-center px-4">
        <div className="flex-1">
          <span className="font-semibold text-2xl">Forums</span>
          <span className="text-muted-foreground text-xs">
            {" "}
            by{" "}
            <a
              className="text-orange-500 hover:underline"
              href="https://basehub.com"
              rel="noopener noreferrer"
              target="_blank"
            >
              BaseHub
            </a>
            .
          </span>
        </div>

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

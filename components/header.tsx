"use client"

import { authClient } from "@/lib/auth-client"
import { Button } from "./ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div>
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

        <div>
          <User />
        </div>
      </div>
    </header>
  )
}

const User = () => {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
    return <div className="h-9 w-32 animate-pulse rounded-md bg-muted" />
  }

  if (!session) {
    return (
      <Button onClick={() => authClient.signIn.social({ provider: "github" })}>
        Sign in with GitHub
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          type="button"
        >
          {/** biome-ignore lint/correctness/useImageSize: . */}
          {/** biome-ignore lint/performance/noImgElement: . */}
          <img
            alt={session.user.name}
            className="size-8 rounded-full"
            src={session.user.image || ""}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex items-center gap-2 px-2 py-1.5">
          {/** biome-ignore lint/correctness/useImageSize: . */}
          {/** biome-ignore lint/performance/noImgElement: . */}
          <img
            alt={session.user.name}
            className="size-8 rounded-full"
            src={session.user.image || ""}
          />
          <div className="flex flex-col">
            <span className="font-medium text-sm">{session.user.name}</span>
            <span className="text-muted-foreground text-xs">
              {session.user.email}
            </span>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => authClient.signOut()}
          variant="destructive"
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

"use client"

import Link from "next/link"
import { Tooltip } from "@/components/ui/tooltip"

export function AuthorAvatar({ username }: { username: string }) {
  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger
          render={
            <Link
              className="flex h-5 w-5 overflow-clip rounded-full"
              href={`/user/${username}`}
            >
              <img alt={username} src={`https://github.com/${username}.png`} />
            </Link>
          }
        />
        <Tooltip.Popup>{username}</Tooltip.Popup>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}

"use client"

import { Tooltip } from "@base-ui/react/tooltip"
import Link from "next/link"

export function AuthorAvatar({ username }: { username: string }) {
  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger
          render={
            <Link
              className="absolute top-1/2 flex h-5 w-5 -translate-y-1/2 overflow-clip rounded-full"
              href={`/user/${username}`}
            >
              <img alt={username} src={`https://github.com/${username}.png`} />
            </Link>
          }
        />
        <Tooltip.Portal>
          <Tooltip.Positioner>
            <Tooltip.Popup>{username}</Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}

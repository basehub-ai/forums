"use client"

import { Tooltip } from "@base-ui/react/tooltip"
import Link from "next/link"

export function AuthorAvatar({ username }: { username: string }) {
  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger
          render={
            <Link href={`/user/${username}`}>
              <img
                alt={username}
                className="-translate-y-1/2 absolute top-1/2 h-6 w-6 rounded-full"
                src={`https://github.com/${username}.png`}
              />
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

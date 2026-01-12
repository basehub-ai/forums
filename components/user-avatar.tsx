"use client"

import Image from "next/image"
import { Tooltip } from "@/components/ui/tooltip"

type BaseProps = {
  username: string
  src?: string
  size?: number
}

export function UserAvatar({ username, src, size = 20 }: BaseProps) {
  const imageSrc = src ?? `https://github.com/${username}.png`

  const image = (
    <div
      className="flex overflow-clip rounded-full"
      style={{ width: size, height: size }}
    >
      <Image
        alt={`Avatar of ${username}`}
        height={size}
        src={imageSrc}
        width={size}
      />
    </div>
  )

  if (!username) {
    return image
  }

  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger render={image} />
        <Tooltip.Popup>{username}</Tooltip.Popup>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}

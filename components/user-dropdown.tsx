"use client"

import type { Session, User } from "better-auth"
import { useRouter } from "next/navigation"
import { Menu } from "@/components/ui/menu"
import { authClient } from "@/lib/auth-client"

export const UserDropdown = ({ user }: { user: User; session: Session }) => {
  const router = useRouter()
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")

  return (
    <Menu.Root>
      <Menu.Trigger className="group flex cursor-pointer items-center gap-1 px-1">
        <img
          alt={user.name}
          className="size-5 rounded-full"
          src={user.image || ""}
        />
        <span className="select-none uppercase group-hover:underline">
          {initials}
        </span>
      </Menu.Trigger>
      <Menu.Popup align="end">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <img
            alt={user.name}
            className="size-8 rounded-full"
            src={user.image || ""}
          />
          <div className="flex flex-col">
            <span className="font-semibold text-sm">{user.name}</span>
            <span className="text-xs">{user.email}</span>
          </div>
        </div>
        <Menu.Separator />
        <Menu.Item
          onClick={async () => {
            await authClient.signOut()
            router.refresh()
          }}
        >
          Sign out
        </Menu.Item>
      </Menu.Popup>
    </Menu.Root>
  )
}

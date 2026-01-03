"use client"
import { Menu } from "@base-ui/react/menu"
import type { Session, User } from "better-auth"
import { useRouter } from "next/navigation"
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
        <span className="select-none font-medium text-faint uppercase group-hover:underline">
          {initials}
        </span>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end">
          <Menu.Popup>
            <div className="flex items-center gap-2 px-2 py-1.5">
              <img
                alt={user.name}
                className="size-8 rounded-full"
                src={user.image || ""}
              />
              <div className="flex flex-col">
                <span className="font-medium text-sm">{user.name}</span>
                <span className="text-muted-foreground text-xs">
                  {user.email}
                </span>
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
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}

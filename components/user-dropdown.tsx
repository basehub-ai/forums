"use client"

import { useCustomer } from "autumn-js/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Menu } from "@/components/ui/menu"
import { Meter } from "@/components/ui/meter"
import { UserAvatar } from "@/components/user-avatar"
import { authClient } from "@/lib/auth-client"
import { useDialogStore } from "@/lib/stores/dialogs"
import { formatRelativeTime } from "@/lib/utils"

export const UserDropdown = ({
  name,
  username,
  userImage,
  email,
}: {
  name: string
  username: string
  userImage: string
  email: string
}) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const { customer, check, openBillingPortal } = useCustomer()
  const setPaywallOpen = useDialogStore((s) => s.setPaywallOpen)
  const isProUser = check({ productId: "pro_plan" }).data.allowed
  const hasCanceledPro =
    check({ productId: "pro_plan" }).data.status === "canceled"
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")

  const credits = customer?.features?.standard_credits
  const creditsMax = credits?.included_usage

  return (
    <Menu.Root onOpenChange={setOpen} open={open}>
      <Menu.Trigger className="group flex animate-fade-in cursor-pointer items-center gap-1 px-1">
        <UserAvatar src={userImage} username={username} />
        <span className="select-none uppercase group-hover:underline">
          {initials}
        </span>
      </Menu.Trigger>
      <Menu.Popup align="end">
        {username && userImage ? (
          <Link
            className="flex items-center gap-2 px-2 py-1.5 hover:bg-foreground/5"
            href={`/user/${username}`}
            onClick={() => setOpen(false)}
          >
            <UserAvatar size={32} src={userImage} username={username} />
            <div className="flex flex-col">
              <span className="font-semibold text-dim text-sm">{name}</span>
              <span className="text-xs">@{username}</span>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-2 px-2 py-1.5">
            <UserAvatar size={32} src={userImage} username={username} />
            <div className="flex flex-col">
              <span className="font-semibold text-dim text-sm">{name}</span>
              <span className="text-xs">{email}</span>
            </div>
          </div>
        )}
        <Menu.Separator />
        <div className="space-y-2 p-1.5">
          <Meter.Root max={creditsMax} min={0} value={credits?.usage ?? 0}>
            <div className="flex items-center justify-between">
              <Meter.Label>Credits</Meter.Label>
              <span className="text-muted text-xs tabular-nums">
                {credits?.usage ?? 0}/{creditsMax}
              </span>
            </div>
            <Meter.Track>
              <Meter.Indicator />
            </Meter.Track>
            <span className="text-muted text-xs tabular-nums">
              {credits?.balance ?? 0} remaining
            </span>
          </Meter.Root>
          <span className="text-muted text-xs tabular-nums">
            {hasCanceledPro ? "Ends " : "Resets "}
            {isProUser
              ? new Date(credits?.next_reset_at ?? 0).toLocaleDateString(
                  "en-US",
                  { month: "short", day: "numeric" }
                )
              : credits?.next_reset_at
                ? formatRelativeTime(credits?.next_reset_at)
                : "N/A"}
          </span>
          {!isProUser && (
            <button
              className="w-0 min-w-full cursor-pointer text-balance text-left text-accent text-xs hover:text-accent hover:underline active:text-accent"
              onClick={() => setPaywallOpen(true)}
              type="button"
            >
              Upgrade your plan to get more credits now
            </button>
          )}
        </div>
        <Menu.Separator />
        {isProUser && (
          <Menu.Item
            onClick={async () => {
              await openBillingPortal({
                returnUrl: window.location.href,
              })
            }}
          >
            Manage plan
          </Menu.Item>
        )}
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

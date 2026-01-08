"use client"

import { useCustomer } from "autumn-js/react"
import type { Session, User } from "better-auth"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Menu } from "@/components/ui/menu"
import { Meter } from "@/components/ui/meter"
import { authClient } from "@/lib/auth-client"
import { useDialogStore } from "@/lib/stores/dialogs"
import { formatRelativeTime } from "@/lib/utils"

export const UserDropdown = ({
  user,
  username,
}: {
  user: User
  session: Session
  username: string | null
}) => {
  const router = useRouter()
  const { customer, check, openBillingPortal } = useCustomer()
  const setPaywallOpen = useDialogStore((s) => s.setPaywallOpen)
  const isProUser = check({ productId: "pro_plan" }).data.allowed
  const hasCanceledPro =
    check({ productId: "pro_plan" }).data.status === "canceled"
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")

  const credits = customer?.features?.standard_credits
  const creditsMax = credits?.included_usage

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
        {username ? (
          <Link
            className="flex items-center gap-2 px-2 py-1.5 hover:bg-foreground/5"
            href={`/user/${username}`}
          >
            <img
              alt={user.name}
              className="size-8 rounded-full"
              src={user.image || ""}
            />
            <div className="flex flex-col">
              <span className="font-semibold text-dim text-sm">
                {user.name}
              </span>
              <span className="text-xs">@{username}</span>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-2 px-2 py-1.5">
            <img
              alt={user.name}
              className="size-8 rounded-full"
              src={user.image || ""}
            />
            <div className="flex flex-col">
              <span className="font-semibold text-dim text-sm">
                {user.name}
              </span>
              <span className="text-xs">{user.email}</span>
            </div>
          </div>
        )}
        <Menu.Separator />
        <div className="space-y-2 px-2 py-1.5">
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

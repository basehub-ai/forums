"use client"

import { Menu as BaseMenu } from "@base-ui/react/menu"
import { cn } from "@/lib/utils"
import { DotsShadow } from "./dots-shadow"

const Root = BaseMenu.Root

function Trigger({
  className,
  ...props
}: React.ComponentProps<typeof BaseMenu.Trigger>) {
  return (
    <BaseMenu.Trigger
      className={cn(
        "inline-flex cursor-pointer items-center gap-1 text-faint text-sm transition-colors duration-300 hover:text-bright hover:underline hover:duration-100 active:text-bright data-popup-open:text-bright",
        "hover:text-bright data-popup-open:text-bright",
        className
      )}
      {...props}
    />
  )
}

function Popup({
  className,
  sideOffset = 4,
  align = "start",
  children,
  ...props
}: React.ComponentProps<typeof BaseMenu.Popup> & {
  sideOffset?: number
  align?: "start" | "center" | "end"
}) {
  return (
    <BaseMenu.Portal>
      <BaseMenu.Positioner align={align} sideOffset={sideOffset}>
        <div className="relative">
          <BaseMenu.Popup
            className={cn(
              "peer relative z-50 min-w-[160px] border border-dim bg-background p-1 text-sm",
              "transform-gpu transition-opacity duration-100",
              "data-open:opacity-100",
              "outline-none data-closed:pointer-events-none data-closed:opacity-0",
              className
            )}
            {...props}
          >
            {children}
          </BaseMenu.Popup>
          <DotsShadow
            className={cn(
              "transform-gpu transition-opacity duration-100",
              "peer-data-open:opacity-100",
              "peer-data-closed:opacity-0"
            )}
          />
        </div>
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  )
}

function Item({
  className,
  ...props
}: React.ComponentProps<typeof BaseMenu.Item>) {
  return (
    <BaseMenu.Item
      className={cn(
        "flex cursor-pointer items-center gap-2 px-2 py-1.5 text-muted outline-none transition-colors",
        "data-highlighted:bg-shade data-highlighted:text-bright",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

function Separator({
  className,
  ...props
}: React.ComponentProps<typeof BaseMenu.Separator>) {
  return (
    <BaseMenu.Separator
      className={cn("my-1 h-px bg-border-solid", className)}
      {...props}
    />
  )
}

export const Menu = {
  Root,
  Trigger,
  Popup,
  Item,
  Separator,
}

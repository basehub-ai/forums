"use client"

import { Menu as BaseMenu } from "@base-ui/react/menu"
import { cn } from "@/lib/utils"

const Root = BaseMenu.Root

function Trigger({
  className,
  ...props
}: React.ComponentProps<typeof BaseMenu.Trigger>) {
  return (
    <BaseMenu.Trigger
      className={cn(
        "inline-flex cursor-pointer items-center gap-1 text-dim text-sm transition-colors",
        "hover:text-bright data-[popup-open]:text-bright",
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
        <BaseMenu.Popup
          className={cn(
            "z-50 min-w-[160px] border border-border-solid bg-background p-1 text-sm shadow-md",
            "origin-[var(--transform-origin)] transition-[opacity,transform] duration-150",
            "data-[open]:opacity-100 data-[open]:scale-100 data-[open]:translate-y-0",
            "data-[closed]:opacity-0 data-[closed]:scale-95 data-[closed]:-translate-y-1 data-[closed]:pointer-events-none",
            className
          )}
          {...props}
        >
          {children}
        </BaseMenu.Popup>
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
        "flex cursor-pointer items-center gap-2 px-2 py-1.5 text-dim outline-none transition-colors",
        "data-[highlighted]:bg-shade data-[highlighted]:text-bright",
        "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
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

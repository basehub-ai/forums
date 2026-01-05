"use client"

import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip"
import { cn } from "@/lib/utils"

const Provider = BaseTooltip.Provider

const Root = BaseTooltip.Root

const Trigger = BaseTooltip.Trigger

function Popup({
  className,
  children,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof BaseTooltip.Popup> & { sideOffset?: number }) {
  return (
    <BaseTooltip.Portal>
      <BaseTooltip.Positioner sideOffset={sideOffset}>
        <BaseTooltip.Popup
          className={cn(
            "z-50 max-w-[280px] bg-bright px-2 py-1 text-background text-sm shadow-sm",
            "transition-[opacity,transform] duration-100",
            className
          )}
          {...props}
        >
          {children}
        </BaseTooltip.Popup>
      </BaseTooltip.Positioner>
    </BaseTooltip.Portal>
  )
}

export const Tooltip = {
  Provider,
  Root,
  Trigger,
  Popup,
}

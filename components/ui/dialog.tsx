"use client"

import { Dialog as BaseDialog } from "@base-ui/react/dialog"
import { cn } from "@/lib/utils"
import { DotsShadow } from "./dots-shadow"

const Root = BaseDialog.Root

function Trigger({
  className,
  ...props
}: React.ComponentProps<typeof BaseDialog.Trigger>) {
  return (
    <BaseDialog.Trigger
      className={cn(
        "inline-flex cursor-pointer items-center gap-1 text-faint text-sm transition-colors duration-300 hover:text-bright hover:underline hover:duration-100 active:text-bright",
        className
      )}
      {...props}
    />
  )
}

function Portal({
  children,
  ...props
}: React.ComponentProps<typeof BaseDialog.Portal>) {
  return (
    <BaseDialog.Portal {...props}>
      <BaseDialog.Viewport className="fixed inset-0 flex items-start justify-center pt-[15vh]">
        {children}
      </BaseDialog.Viewport>
    </BaseDialog.Portal>
  )
}

function Backdrop({
  className,
  ...props
}: React.ComponentProps<typeof BaseDialog.Backdrop>) {
  return (
    <BaseDialog.Backdrop
      className={cn(
        "fixed inset-0 bg-background/60",
        "transition-none",
        "data-open:opacity-100",
        "data-closed:opacity-0",
        className
      )}
      {...props}
    />
  )
}

function Popup({
  className,
  children,
  title,
  ...props
}: React.ComponentProps<typeof BaseDialog.Popup> & {
  title?: string
}) {
  return (
    <BaseDialog.Popup
      className={cn(
        "w-full max-w-lg",
        "outline-none",
        "data-open:scale-100 data-open:opacity-100",
        "data-closed:scale-95 data-closed:opacity-0",
        className
      )}
      {...props}
    >
      <div className="relative">
        <div className="relative z-10 border border-dim bg-background">
          {title && (
            <div className="absolute -top-4 right-0 left-4 flex items-center">
              <span className="bg-background px-2 font-bold text-bright text-lg tracking-normal">
                {title}
              </span>
              <div className="h-px flex-1 bg-border-dim" />
            </div>
          )}
          <div className={cn("p-6")}>{children}</div>
        </div>
        <DotsShadow className="top-2.5 left-2.5" colorBackground="#00000000" />
      </div>
    </BaseDialog.Popup>
  )
}

function Description({
  className,
  ...props
}: React.ComponentProps<typeof BaseDialog.Description>) {
  return (
    <BaseDialog.Description
      className={cn("text-muted text-sm", className)}
      {...props}
    />
  )
}

function Close({
  className,
  ...props
}: React.ComponentProps<typeof BaseDialog.Close>) {
  return (
    <BaseDialog.Close
      className={cn(
        "inline-flex cursor-pointer items-center justify-center text-muted text-sm transition-colors hover:text-bright",
        className
      )}
      {...props}
    />
  )
}

export const Dialog = {
  Root,
  Trigger,
  Portal,
  Backdrop,
  Popup,
  Description,
  Close,
}

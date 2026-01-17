import { cn } from "@/lib/utils"

export const Title = ({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) => {
  return (
    <h1
      className={cn(
        "text-pretty font-bold text-bright text-lg tracking-normal underline",
        className
      )}
    >
      {children}
    </h1>
  )
}

export const Subtitle = ({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) => {
  return (
    <p className={cn("text-pretty leading-[1.3]", className)}>{children}</p>
  )
}

export const List = ({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) => {
  return (
    <div className={cn("flex flex-col gap-2.5", className)}>{children}</div>
  )
}

export const ListItem = ({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) => {
  return <div className={cn("flex", className)}>{children}</div>
}

export const TableColumnTitle = ({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) => {
  return (
    <span
      className={cn(
        "bg-background px-2 font-medium text-sm uppercase",
        className
      )}
    >
      {children}
    </span>
  )
}

export const TableCellText = ({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) => {
  return <div className={cn("leading-none", className)}>{children}</div>
}

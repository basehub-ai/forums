import { cn } from "@/lib/utils"

export const Title = ({
  className,
  children,
  underline,
}: {
  className?: string
  children: React.ReactNode
  underline?: boolean
}) => {
  return (
    <h1
      className={cn(
        "text-pretty font-bold text-dim text-lg tracking-normal sm:text-base",
        underline && "underline decoration-1 underline-offset-4",
        className
      )}
    >
      {children}
    </h1>
  )
}

export const Section = ({
  className,
  children,
  title,
  id,
}: {
  className?: string
  children: React.ReactNode
  title: string
  id?: string
}) => {
  return (
    <section className={cn("mt-10", className)} id={id}>
      {id ? (
        <a
          className="text-pretty font-bold text-dim text-lg tracking-normal hover:underline sm:text-base"
          href={`#${id}`}
        >
          {title}
        </a>
      ) : (
        <h2 className="text-pretty font-bold text-dim text-lg tracking-normal sm:text-base">
          {title}
        </h2>
      )}
      {children}
    </section>
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
  return <div className={cn("flex h-4.5 font-pixel", className)}>{children}</div>
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

import { cn } from "@/lib/utils"

export const Container = ({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) => {
  return (
    <div className={cn("mx-auto max-w-200 px-4 2xl:max-w-4xl", className)}>
      {children}
    </div>
  )
}

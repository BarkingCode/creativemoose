import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-gradient-to-br from-gray-700/80 to-gray-900/80", className)}
      {...props}
    />
  )
}

export { Skeleton }

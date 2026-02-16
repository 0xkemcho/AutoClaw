import { cn } from "@/lib/utils"

interface SkeletonProps extends React.ComponentProps<"div"> {
  shimmer?: boolean;
}

function Skeleton({ className, shimmer, ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      role="status"
      aria-label="Loading"
      className={cn(
        "rounded-md",
        shimmer
          ? "bg-accent animate-shimmer [background-image:linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.1)_50%,transparent_100%)] [background-size:200%_100%]"
          : "bg-accent animate-pulse",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }

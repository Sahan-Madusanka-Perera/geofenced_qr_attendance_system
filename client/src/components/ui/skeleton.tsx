import { cn } from "@/lib/utils"

/* An unfilled cell on the board, drawn as deliberately as a filled one. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse bg-slat", className)}
      {...props}
    />
  )
}

export { Skeleton }

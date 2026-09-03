import * as React from "react"

import { cn } from "@/lib/utils"

/* A field on the board is a cell waiting to be filled: square, recessed,
   with an amber rule under the cursor when it has focus. */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 border border-char-faint bg-board px-3 font-board text-[13px] text-char outline-none transition-colors",
        "placeholder:font-sans placeholder:text-sm placeholder:normal-case placeholder:tracking-normal placeholder:text-char-faint",
        "hover:border-char-faint",
        "focus-visible:border-amber focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-amber",
        "disabled:cursor-not-allowed disabled:opacity-40",
        "aria-[invalid=true]:border-red",
        className
      )}
      {...props}
    />
  )
}

export { Input }

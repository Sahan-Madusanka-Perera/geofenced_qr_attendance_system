import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheck, Info, TriangleAlert, OctagonX, Loader2 } from "lucide-react"

/* Toasts are slats: square, board type, one edge lit by the tone. */
const Toaster = ({ ...props }: ToasterProps) => (
  <Sonner
    theme="dark"
    position="bottom-right"
    className="toaster group"
    icons={{
      success: <CircleCheck className="size-4 text-green" />,
      info: <Info className="size-4 text-char-dim" />,
      warning: <TriangleAlert className="size-4 text-amber" />,
      error: <OctagonX className="size-4 text-red" />,
      loading: <Loader2 className="size-4 animate-spin text-amber" />,
    }}
    style={
      {
        "--normal-bg": "hsl(var(--slat))",
        "--normal-text": "hsl(var(--char))",
        "--normal-border": "hsl(var(--slat-edge))",
        "--border-radius": "0px",
      } as React.CSSProperties
    }
    toastOptions={{
      classNames: {
        toast:
          "!rounded-none !border !border-slat-edge !bg-slat !text-char !font-sans !text-[13px] !shadow-[0_18px_40px_-12px_rgba(0,0,0,0.8)]",
        title: "!font-board !text-[11px] !font-semibold !uppercase !tracking-board",
        description: "!text-char-dim !text-[13px]",
      },
    }}
    {...props}
  />
)

export { Toaster }

"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { Check, CircleAlert, Info, Loader2Icon, TriangleAlertIcon } from "lucide-react"

// shadcn/ui Sonner, tailored: Ken OS has one light theme (no next-themes), status colours pair with an icon and
// words, and the card is the white panel with the Studio shadow.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <Check className="size-4 text-status-solid" />,
        info: <Info className="size-4" />,
        warning: <TriangleAlertIcon className="size-4 text-status-partial" />,
        error: <CircleAlert className="size-4 text-status-gap" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--card)",
          "--normal-text": "var(--card-foreground)",
          "--normal-border": "transparent",
          "--border-radius": "var(--radius-xl)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast shadow-xl! ring-1 ring-foreground/5",
          title: "font-semibold",
          description: "text-muted-foreground!",
          actionButton: "font-semibold!",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }

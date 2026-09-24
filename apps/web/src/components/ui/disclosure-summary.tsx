import type { ComponentProps } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function DisclosureSummary({
  children,
  className,
  ...props
}: ComponentProps<"summary">) {
  return (
    <summary
      className={cn(
        "flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden",
        className,
      )}
      {...props}
    >
      <ChevronRight
        aria-hidden="true"
        className="size-4 shrink-0 transition-transform group-open:rotate-90"
        strokeWidth={2}
      />
      {children}
    </summary>
  );
}

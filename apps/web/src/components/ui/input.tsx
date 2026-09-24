import * as React from "react";
import { cn } from "cn";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input data-slot="input" className={cn("h-10 w-full rounded-[10px] border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20", className)} {...props} />;
}

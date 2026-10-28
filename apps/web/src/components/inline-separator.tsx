import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

/**
 * A short vertical rule between items on one line, centred on the text. shadcn's vertical Separator stretches to the
 * row's full height (`self-stretch`), so a shortened one sits at the top; this one centres instead. The primitive in
 * components/ui stays as the registry ships it, so every inline rule goes through here.
 */
export function InlineSeparator({ className }: { className?: string }) {
  return <Separator orientation="vertical" className={cn("h-3.5 data-vertical:self-center", className)} />;
}

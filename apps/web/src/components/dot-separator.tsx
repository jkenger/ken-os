import { cn } from "@/lib/utils";

/**
 * A middle dot between items on one line ("Remote · PH +10 · Full time"), the inline counterpart to
 * `InlineSeparator`'s vertical rule. There's no shadcn primitive for a bare glyph, so this is the one place that
 * sets its character and color -- every inline dot goes through here instead of a literal "·" at the call site.
 */
export function DotSeparator({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("text-[1.4em] leading-none text-border", className)}>
      &middot;
    </span>
  );
}

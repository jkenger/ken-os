import { cn } from "@/lib/utils";

// The KEOS mark and name (renamed from Loots on 26 Oct 2026). The mark is drawn from the name: the K's stem, and its
// arms pulled away as a code bracket. It is a stroke in the accent with no box behind it; the name sits in the text ink.

/** The mark alone, 20px by default. Decorative: the name or an aria-label beside it says what it is. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={cn("size-5 shrink-0 text-sidebar-primary", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="square"
    >
      <path d="M4.5 3.5v13" />
      <path d="M15.5 3.5 8.5 10l7 6.5" />
    </svg>
  );
}

/** The mark beside the name, for the top of the sidebar and the sign-in screen. */
export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 font-heading text-base font-semibold tracking-tight", className)}>
      <BrandMark />
      KEOS
    </span>
  );
}

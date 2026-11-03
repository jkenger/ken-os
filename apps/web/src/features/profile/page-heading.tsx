import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

// The page heading every KEOS module uses: a title over a 1px seam, on the same left edge as the blocks below it. The
// module name is already in the breadcrumb and the sidebar, so the heading carries no label above it.

/** Title with an optional badge and one-line description, and facts on the right. The
 *  description says what the page holds; never a tagline: screens name things, they don't sell them. */
export function PageHeading({
  title,
  badge,
  description,
  facts,
  aside,
}: {
  title: string;
  badge?: ReactNode;
  description?: string;
  facts?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="mb-block block items-start justify-between gap-6 border-b pb-block md:flex">
      <div className="min-w-0">
        <h1 className="font-heading text-2xl leading-tight font-semibold tracking-tight">
          {title}
          {badge && (
            <Badge variant="secondary" className="mt-2.5 table align-middle md:mt-0 md:ml-3 md:inline-flex">
              {badge}
            </Badge>
          )}
        </h1>
        {description && <p className="mt-2.5 max-w-xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {facts && (
        <dl className="mt-5 grid w-full shrink-0 grid-cols-[1fr_1.7fr] gap-2.5 md:mt-0 md:flex md:w-48 md:flex-col md:gap-2 md:pt-1 lg:w-52">
          {facts}
        </dl>
      )}
      {aside}
    </div>
  );
}

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

// The page heading every Loots module uses: a serif title over a hairline rule, as a catalog sets a section head. The
// module name is already in the breadcrumb and the section column, so the heading carries no label above it.

/** Title with an optional badge and one-line description, and facts on the right. The description says what the page
 *  holds; never a tagline: screens name things, they don't sell them. */
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
    <div className="mx-1 mb-5 block items-start justify-between gap-6 border-b pb-5 md:mx-3.5 md:mb-7 md:flex md:pb-6">
      <div className="min-w-0">
        <h1 className="font-heading text-3xl leading-none font-semibold tracking-tight md:text-4xl xl:leading-none">
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

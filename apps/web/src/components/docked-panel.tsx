"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// A side panel for the item you picked (docs/architecture/design-system.md): from 1280px it docks beside the page, so
// the page stays in view and clickable; below that it is a Sheet over it. It holds no content of its own: the caller
// passes the badges, title, description and body. First used by the roadmap's topic panel.

/** The width from which the panel docks. */
const DOCK_QUERY = "(min-width: 1280px)";

/** True from 1280px, where a DockedPanel docks beside the page instead of covering it. */
export function useDocked() {
  const [docked, setDocked] = useState(false);
  useEffect(() => {
    const query = window.matchMedia(DOCK_QUERY);
    const update = () => setDocked(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return docked;
}

export function DockedPanel({
  open,
  docked,
  onClose,
  closeLabel,
  badges,
  title,
  description,
  descriptionFallback,
  facts,
  children,
}: {
  open: boolean;
  /** From useDocked: beside the page when true, a Sheet otherwise. */
  docked: boolean;
  onClose: () => void;
  /** The close button's name, as in "Close topic". */
  closeLabel: string;
  /** Chips above the title. */
  badges?: ReactNode;
  title: string;
  /** A line under the title; when absent, descriptionFallback names the Sheet for screen readers only. */
  description?: string | null;
  descriptionFallback: string;
  /** Anything else for the header, under the description. */
  facts?: ReactNode;
  /** The body: scrolls with the panel; a `sticky bottom-0 mt-auto` footer stays on screen. */
  children: ReactNode;
}) {
  const titleId = useId();

  // Docked, the panel runs from below the shell header (or its top-2 sticky edge once the header scrolls away) down to the
  // shell's bottom edge (its 8px margin and 1px border), so it fills that space and its footer is on screen at any scroll.
  const asideRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const aside = asideRef.current;
    if (!aside) return;
    const fit = () => {
      aside.style.height = `${window.innerHeight - Math.max(aside.getBoundingClientRect().top, 8) - 9}px`;
    };
    fit();
    window.addEventListener("scroll", fit, { passive: true });
    window.addEventListener("resize", fit);
    return () => {
      window.removeEventListener("scroll", fit);
      window.removeEventListener("resize", fit);
    };
  }, [docked, open]);

  // Docked, Escape closes the panel wherever focus is, as the Sheet does. A dialog or menu that Escape closes first calls
  // preventDefault, so it never closes the panel too.
  useEffect(() => {
    if (!docked || !open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [docked, open, onClose]);

  if (docked) {
    if (!open) return null;
    return (
      <aside
        ref={asideRef}
        aria-labelledby={titleId}
        className="sticky top-2 flex h-[calc(100svh-5rem)] w-96 shrink-0 flex-col overflow-y-auto border-l bg-card"
      >
        <div className="grid gap-2.5 border-b p-4">
          <div className="flex items-center gap-2">
            {badges}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={closeLabel}
              className="ml-auto"
              onClick={onClose}
            >
              <IconX aria-hidden="true" />
            </Button>
          </div>
          <h2 id={titleId} className="font-heading text-xl leading-tight font-bold tracking-tight">
            {title}
          </h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
          {facts}
        </div>
        {children}
      </aside>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent className="gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <SheetHeader className="border-b">
          <div className="pr-8">{badges}</div>
          <SheetTitle className="font-heading text-xl">{title}</SheetTitle>
          <SheetDescription className={cn(!description && "sr-only")}>
            {description || descriptionFallback}
          </SheetDescription>
          {facts}
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}

"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { BookOpen, ExternalLink } from "lucide-react";
import { firstTermMatches, termKey } from "@ken-os/domain";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { useSavedTerms, type MarkedTerm } from "@/features/terms/saved-terms";

/** Text the marker reads: page prose, headings and table cells. */
const READING = "p, li, td, th, dd, dt, blockquote, figcaption, h1, h2, h3, h4, h5, h6";
/** Never marked: code, the editor, controls, navigation, hidden text and anything opted out. */
const SKIP =
  "pre, code, .cm-editor, a, button, input, textarea, select, label, nav, [role=button], [contenteditable], [aria-hidden=true], .sr-only, [data-term-skip], [data-term-lookup]";
/** The name of the highlight styled by `::highlight(ken-term)` in public/term-highlight.css. */
const HIGHLIGHT = "ken-term";

interface Mark {
  term: MarkedTerm;
  range: Range;
}

interface Open {
  term: MarkedTerm;
  rect: DOMRect;
}

function readingText(root: Element) {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      return parent && node.nodeValue?.trim() && parent.closest(READING) && !parent.closest(SKIP)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });
  for (let node = walker.nextNode(); node; node = walker.nextNode()) nodes.push(node as Text);
  return nodes;
}

/** Things that can sit on top of a marked word, such as the Explain popover. Pointing at them isn't pointing at the word. */
const COVERING = "[data-term-lookup], a, button, input, textarea, select, [role=button]";

function over(event: Event, selector: string) {
  return event.target instanceof Element && Boolean(event.target.closest(selector));
}

function hit(marks: readonly Mark[], x: number, y: number) {
  return marks.find(({ range }) =>
    Array.from(range.getClientRects()).some(
      (rect) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom,
    ),
  );
}

/**
 * Underlines saved terms on the page, the first time each appears, and shows the saved meaning on hover or tap. The
 * underline is painted with the CSS Custom Highlight API, so the page's own text is never changed. Browsers without it
 * show no marks; Explain still finds saved terms.
 */
export function SavedTermMarks({ root }: { root: RefObject<HTMLDivElement | null> }) {
  const terms = useSavedTerms();
  const marks = useRef<Mark[]>([]);
  const [open, setOpen] = useState<Open | null>(null);
  const openRef = useRef<Open | null>(null);
  openRef.current = open;

  // Find the marks, and again whenever the page's content changes.
  useEffect(() => {
    const element = root.current;
    if (!element || typeof CSS === "undefined" || !("highlights" in CSS)) return;
    const byKey = new Map(terms.map((term) => [termKey(term.term), term]));
    let timer: ReturnType<typeof setTimeout> | undefined;

    const scan = () => {
      const nodes = readingText(element);
      const found = firstTermMatches(
        nodes.map((node) => node.nodeValue ?? ""),
        [...byKey.keys()],
      );
      marks.current = found.flatMap(({ index, start, end, key }) => {
        const term = byKey.get(key);
        if (!term) return [];
        const range = document.createRange();
        range.setStart(nodes[index], start);
        range.setEnd(nodes[index], end);
        return [{ term, range }];
      });
      CSS.highlights.set(HIGHLIGHT, new Highlight(...marks.current.map((mark) => mark.range)));
    };

    scan();
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(scan, 200);
    });
    observer.observe(element, { childList: true, subtree: true, characterData: true });
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      CSS.highlights.delete(HIGHLIGHT);
      marks.current = [];
    };
  }, [root, terms]);

  // Hover opens the card after a short pause, tap or click opens it at once, and leaving both the word and the card
  // closes it.
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let openTimer: ReturnType<typeof setTimeout> | undefined;
    let closeTimer: ReturnType<typeof setTimeout> | undefined;

    const show = (mark: Mark) => setOpen({ term: mark.term, rect: mark.range.getBoundingClientRect() });
    // Checking a pointer against the marks is cheap: each saved term is marked at most once per page.
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const onCard = over(event, "[data-term-card]");
      const mark = over(event, COVERING) ? undefined : hit(marks.current, event.clientX, event.clientY);
      element.toggleAttribute("data-term-hover", Boolean(mark));
      if (mark || onCard) clearTimeout(closeTimer);
      if (mark) {
        if (mark.term.id === openRef.current?.term.id) return;
        clearTimeout(openTimer);
        openTimer = setTimeout(() => show(mark), 250);
      } else {
        clearTimeout(openTimer);
        if (!onCard && openRef.current) closeTimer = setTimeout(() => setOpen(null), 200);
      }
    };
    const onClick = (event: MouseEvent) => {
      if (window.getSelection()?.toString().trim() || over(event, COVERING)) return;
      const mark = hit(marks.current, event.clientX, event.clientY);
      if (!mark) return;
      clearTimeout(openTimer);
      clearTimeout(closeTimer);
      show(mark);
    };
    const onScroll = () => setOpen(null);
    document.addEventListener("pointermove", onMove);
    element.addEventListener("click", onClick);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      clearTimeout(openTimer);
      clearTimeout(closeTimer);
      document.removeEventListener("pointermove", onMove);
      element.removeEventListener("click", onClick);
      window.removeEventListener("scroll", onScroll, true);
      element.removeAttribute("data-term-hover");
    };
  }, [root]);

  if (!open) return null;
  return (
    <Popover open onOpenChange={(next) => !next && setOpen(null)}>
      <PopoverAnchor asChild>
        <span
          aria-hidden="true"
          className="pointer-events-none fixed"
          style={{ left: open.rect.left, top: open.rect.top, width: open.rect.width, height: open.rect.height }}
        />
      </PopoverAnchor>
      <PopoverContent
        data-term-card
        data-term-lookup
        align="start"
        className="w-xs max-w-[calc(100vw-32px)] gap-2 rounded-xl"
        aria-label={`Meaning of ${open.term.term}`}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <p className="font-heading text-base font-semibold tracking-tight">{open.term.term}</p>
        <p className="leading-5">{open.term.meaning}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold">
          {open.term.source && (
            <a
              className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline"
              href={open.term.source.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {open.term.source.title}
              <ExternalLink size={12} aria-hidden="true" />
            </a>
          )}
          <Link
            href={`/terms#term-${open.term.id}`}
            className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline"
            onClick={() => setOpen(null)}
          >
            <BookOpen size={12} aria-hidden="true" />
            Open in Terms
          </Link>
        </p>
      </PopoverContent>
    </Popover>
  );
}

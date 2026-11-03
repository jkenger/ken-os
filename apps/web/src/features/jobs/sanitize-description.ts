import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = ["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "h3", "h4", "a"];

/** Sanitizes a posting's HTML description before it's ever rendered (docs/mockups/Jobs redesign.html, "Desktop /
 *  Job detail"): freehire's own markup is untrusted third-party content, so this runs at render time, every
 *  time, rather than once at save time -- the sanitizer's own rules can tighten later without re-scraping
 *  anything. Only basic formatting survives: scripts, inline event handlers and javascript: links are stripped
 *  (the last via `sanitize-html`'s default `allowedSchemes`, which excludes `javascript:`).
 *
 *  `isomorphic-dompurify` ran a real jsdom on the server to do this; `sanitize-html` is pure JS (no jsdom), which
 *  matters here specifically because `jsdom@30` pulls in `html-encoding-sniffer@7.0.0`, a CommonJS package that
 *  statically `require()`s an ESM-only dependency (`@exodus/bytes`) -- that throws `ERR_REQUIRE_ESM` in Vercel's
 *  Node runtime on every call, which is what broke every job detail page before this swap. */
export function sanitizeDescriptionHtml(html: string | null): string | null {
  if (html === null) return null;
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { a: ["href"] },
  });
}

import DOMPurify from "isomorphic-dompurify";

/** Sanitizes a posting's HTML description before it's ever rendered (docs/mockups/Jobs redesign.html, "Desktop /
 *  Job detail"): freehire's own markup is untrusted third-party content, so this runs at render time, every
 *  time, rather than once at save time -- the sanitizer's own rules can tighten later without re-scraping
 *  anything. Only basic formatting survives: scripts, inline event handlers and javascript: links are stripped. */
export function sanitizeDescriptionHtml(html: string | null): string | null {
  if (html === null) return null;
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "h3", "h4", "a"],
    ALLOWED_ATTR: ["href"],
  });
}

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// A skill's logo (docs/mockups/Jobs redesign.html, "Desktop / Job detail" -- the skills row under the
// description), from Simple Icons' CDN by the slug in `skills-dictionary.ts`. Simple Icons doesn't cover every
// slug this dictionary names, and a 404 there renders as a broken-image box -- this hides itself on error
// instead, so an unmatched logo just means no icon, not a broken one.

export function SkillLogo({ slug, alt, className }: { slug: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <img
      src={`https://cdn.simpleicons.org/${slug}`}
      alt={alt}
      loading="lazy"
      className={cn("size-3.5 shrink-0", className)}
      onError={() => setFailed(true)}
    />
  );
}

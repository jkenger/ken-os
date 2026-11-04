"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

// A skill's logo (docs/mockups/Jobs redesign.html, "Desktop / Job detail" -- the skills row under the
// description), from Simple Icons' CDN by the slug in `skills-dictionary.ts`. Simple Icons doesn't cover every
// slug this dictionary names, and a 404 there renders as a broken-image box -- this hides itself on error
// instead, so an unmatched logo just means no icon, not a broken one. `next/image`, not a raw `img`
// (`images.remotePatterns` in next.config.ts).

export function SkillLogo({ slug, alt, className }: { slug: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <Image
      src={`https://cdn.simpleicons.org/${slug}`}
      alt={alt}
      width={14}
      height={14}
      className={cn("size-3.5 shrink-0", className)}
      onError={() => setFailed(true)}
    />
  );
}

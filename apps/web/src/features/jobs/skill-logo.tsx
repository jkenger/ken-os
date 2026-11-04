"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

// A skill's logo (docs/mockups/Jobs redesign.html, "Desktop / Job detail" -- the skills row under the
// description), from Simple Icons' CDN by the slug in `skills-dictionary.ts`. Simple Icons doesn't cover every
// slug this dictionary names, and a 404 there renders as a broken-image box -- this hides itself on error
// instead, so an unmatched logo just means no icon, not a broken one. `next/image`, not a raw `img`
// (`images.remotePatterns` in next.config.ts) -- `unoptimized`, since the CDN serves SVG without a `.svg` in the
// URL, so Next can't auto-detect it and tries to run every one through its raster image pipeline, which fails
// for an SVG and silently fired `onError` on every logo (confirmed against this Next version's own image docs:
// "We recommend using the unoptimized prop when the src prop is known to be SVG. This happens automatically
// when src ends with '.svg'" -- ours never does). SVGs don't benefit from that pipeline anyway (lossless at any
// size already), so this isn't a tradeoff.

export function SkillLogo({ slug, alt, className }: { slug: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <Image
      src={`https://cdn.simpleicons.org/${slug}`}
      alt={alt}
      width={14}
      height={14}
      unoptimized
      className={cn("size-3.5 shrink-0", className)}
      onError={() => setFailed(true)}
    />
  );
}

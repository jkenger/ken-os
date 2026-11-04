"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

// A posting's company avatar (docs/mockups/Jobs redesign.html): a real logo where one can be found, the
// company's initials otherwise. Neither freehire nor our own extraction captures a company's actual domain, so
// the logo is a guess -- strip common legal suffixes, drop punctuation, append ".com" -- resolved through
// Google's keyless favicon service, which genuinely 404s for a domain it doesn't recognize (confirmed live,
// not the "generic globe for anything" behavior some favicon services default to). A wrong guess or a 404 just
// falls back to initials, the same `onError`-hides-itself shape as `SkillLogo`. `next/image`, not a raw `img`
// (`images.remotePatterns` in next.config.ts) -- `onError` still fires the same way for a 400 from Next's own
// image optimizer as it would for a plain 404.
// shortcut: the domain guess is wrong for plenty of real companies (anything not name≈domain); upgrade to a
// real logo-lookup API if the hit rate matters more than it does today.

const LEGAL_SUFFIX = /[,.]?\s*\b(inc|llc|ltd|limited|corp|corporation|co|company|group|holdings|plc|gmbh|pty)\.?\s*$/i;

export function guessCompanyDomain(company: string): string | null {
  const withoutSuffix = company.trim().replace(LEGAL_SUFFIX, "");
  const slug = withoutSuffix.toLowerCase().replace(/[^a-z0-9]/g, "");
  return slug ? `${slug}.com` : null;
}

function initials(company: string): string {
  const words = company.trim().split(/\s+/).filter(Boolean);
  return (words[0]?.[0] ?? "?").toUpperCase() + (words[1]?.[0] ?? "").toUpperCase();
}

const SIZE_CLASSES = { sm: "size-10 text-sm", md: "size-12 text-base" } as const;

export function CompanyAvatar({ company, size = "sm" }: { company: string; size?: keyof typeof SIZE_CLASSES }) {
  const domain = guessCompanyDomain(company);
  const [failed, setFailed] = useState(false);

  if (!domain || failed) {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md bg-muted font-semibold text-muted-foreground",
          SIZE_CLASSES[size],
        )}
      >
        {initials(company)}
      </span>
    );
  }

  return (
    <Image
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`}
      alt=""
      width={64}
      height={64}
      className={cn("shrink-0 rounded-md bg-muted object-contain p-2", SIZE_CLASSES[size])}
      onError={() => setFailed(true)}
    />
  );
}

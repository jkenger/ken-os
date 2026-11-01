"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { countryFlag, countryName } from "@/features/jobs/country-flags";

// A posting's countries on the detail page's Location/Country rows (docs/mockups/Jobs redesign.html, "Desktop /
// Job detail"): stacked avatars showing the plain two-letter code, click to expand into a flag-and-name badge
// row. Flags only appear once expanded -- the collapsed avatars read as avatars, not a row of flags.

export function CountryAvatarGroup({ countries, max = 5 }: { countries: string[]; max?: number }) {
  const [expanded, setExpanded] = useState(false);

  if (countries.length === 0) {
    return <span className="text-sm text-muted-foreground">Not listed</span>;
  }

  const shown = countries.slice(0, max);
  const overflow = countries.length - shown.length;

  return (
    <div>
      <Button
        type="button"
        variant="ghost"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
        className="h-auto w-fit rounded-full p-0.5"
      >
        <AvatarGroup>
          {shown.map((code) => (
            <Avatar key={code} size="sm" title={countryName(code)}>
              <AvatarFallback className="text-[0.625rem]">{code.toUpperCase()}</AvatarFallback>
            </Avatar>
          ))}
          {overflow > 0 && <AvatarGroupCount className="text-xs">+{overflow}</AvatarGroupCount>}
        </AvatarGroup>
      </Button>
      {expanded && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {countries.map((code) => (
            <Badge key={code} variant="outline">
              {countryFlag(code)} {countryName(code)}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

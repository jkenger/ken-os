"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { countryFlag, countryName } from "@/features/jobs/country-flags";
import { EmptyState } from "./empty-state";

// A posting's countries on the detail page's Location/Country rows (docs/mockups/Jobs redesign.html, "Desktop /
// Job detail"): stacked avatars showing the plain two-letter code, click to expand into a flag-and-name badge
// row. Flags only appear once expanded -- the collapsed avatars read as avatars, not a row of flags. No
// countries stated reuses the Company tab's own boxed empty state, shrunk to one row, instead of a bare text
// fallback that reads as broken rather than intentional.
//
// The root is `display: contents` (invisible to layout) so the trigger button and the expanded panel become
// direct children of whatever flex-wrap row the caller puts this in -- the trigger then sits inline with a
// label next to it (e.g. "Country"), and the expanded panel (`w-full`) forces its own line below instead of
// being squeezed into a narrow column the way a real wrapping div would be.

export function CountryAvatarGroup({ countries, max = 5 }: { countries: string[]; max?: number }) {
  const [expanded, setExpanded] = useState(false);

  if (countries.length === 0) {
    return (
      <EmptyState
        message="Not listed"
        className="w-fit gap-0 rounded-md border-dashed px-2.5 py-1.5 text-left text-xs"
      />
    );
  }

  const shown = countries.slice(0, max);
  const overflow = countries.length - shown.length;

  return (
    <div className="contents">
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
        <div className="mt-2.5 flex w-full flex-wrap gap-1.5">
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

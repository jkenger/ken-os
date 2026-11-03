"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** A free-text list edited as removable chips, typing then Enter (or blur) to add one -- Roles and Skip words on
 *  the filter sidebar use this same shape. The filled well and bordered, card-coloured chip match the `.inp`/
 *  `.chip` tokens in `docs/mockups/jobs-redesign-canvas/Filters-applied.dc.html` and `Onboarding.dc.html`. */
export function ChipField({
  label,
  values,
  placeholder,
  onChange,
}: {
  /** Omit when a field already has its own heading above (Roles, which pairs this with an "Import from Profile"
   *  button) -- Skip words and Skip companies still pass one, since they have no other label of their own. */
  label?: string;
  values: string[];
  placeholder: string;
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && !values.includes(trimmed)) onChange([...values, trimmed]);
    setDraft("");
  }

  return (
    <div className="grid min-w-0 gap-1.5">
      {label && <Label className="mb-0">{label}</Label>}
      <div className="flex min-h-9 min-w-0 flex-wrap items-center gap-1.5 rounded-md bg-muted px-2 py-1.5">
        {values.map((value) => (
          <Badge key={value} variant="outline" className="max-w-40 gap-1 bg-card py-0 pr-0.5">
            <span className="truncate" title={value}>
              {value}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={`Remove ${value}`}
              onClick={() => onChange(values.filter((item) => item !== value))}
              className="size-4 shrink-0 rounded-full"
            >
              ×
            </Button>
          </Badge>
        ))}
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
            }
          }}
          onBlur={commit}
          placeholder={values.length === 0 ? placeholder : ""}
          className="h-6 min-w-20 flex-1 border-none bg-transparent p-0 focus-visible:ring-0"
        />
      </div>
    </div>
  );
}

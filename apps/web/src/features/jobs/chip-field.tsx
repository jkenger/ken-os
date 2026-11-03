"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** A free-text list edited as removable chips, typing then Enter (or blur) to add one -- Countries, Skip words,
 *  Skip companies on the filter sidebar, and Roles on the onboarding form all use this same shape
 *  (docs/mockups/Jobs redesign.html). */
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
    <div className="grid gap-1.5">
      {label && <Label className="mb-0">{label}</Label>}
      <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5">
        {values.map((value) => (
          <Badge key={value} variant="secondary" className="gap-1 py-0 pr-0.5">
            {value}
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={`Remove ${value}`}
              onClick={() => onChange(values.filter((item) => item !== value))}
              className="size-4 rounded-full"
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

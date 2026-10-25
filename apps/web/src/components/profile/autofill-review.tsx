"use client";

import { IconCheck, IconPlus } from "@tabler/icons-react";
import type { AutofillChange } from "@ken-os/domain";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// The Autofill review in Profile's side panel (docs/mockups/profile.md, direction A): every field a resume would change,
// grouped by section, each picked or left out on its own. Nothing reaches the form until Accept.
// Spec: docs/product/profile-resume.md, "Step 5 design".

/** The changes in their sections, in form order. */
function sections(changes: AutofillChange[]) {
  const groups: { section: string; changes: AutofillChange[] }[] = [];
  for (const change of changes) {
    const group = groups.find((item) => item.section === change.section);
    if (group) group.changes.push(change);
    else groups.push({ section: change.section, changes: [change] });
  }
  return groups;
}

function Values({ change }: { change: AutofillChange }) {
  const added = change.before.length === 0;
  return (
    <dl className="grid grid-cols-[52px_minmax(0,1fr)] items-baseline gap-x-2 gap-y-1 text-[13px]">
      <dt className="text-xs text-muted-foreground">Now</dt>
      <dd className="flex flex-col items-start gap-1">
        {added ? (
          <span className="text-muted-foreground">Not set</span>
        ) : (
          change.before.map((line, index) => (
            <span
              key={index}
              className="rounded-sm bg-diff-remove-soft px-1 [overflow-wrap:anywhere] text-diff-remove line-through"
            >
              {line}
            </span>
          ))
        )}
      </dd>
      <dt className="text-xs text-muted-foreground">Resume</dt>
      <dd className="flex flex-col items-start gap-1">
        {change.after.map((line, index) => (
          <span
            key={index}
            className="inline-flex items-start gap-1 rounded-sm bg-diff-add-soft px-1 [overflow-wrap:anywhere] text-diff-add"
          >
            {added && <IconPlus size={12} aria-hidden="true" className="mt-0.75 shrink-0" />}
            {line}
          </span>
        ))}
      </dd>
    </dl>
  );
}

export function AutofillReview({
  changes,
  matches,
  selected,
  onToggle,
}: {
  changes: AutofillChange[];
  /** Sections the file fills with what is there already, folded into one line. */
  matches: string[];
  selected: string[];
  onToggle: (id: string, on: boolean) => void;
}) {
  return (
    <div className="flex flex-col px-5 pb-4">
      {changes.length === 0 && <p className="pt-4 font-semibold">Nothing to change</p>}
      {sections(changes).map((group) => (
        <section key={group.section} aria-label={group.section} className="pt-4">
          <div className="mb-1.5 flex justify-between border-b pb-1.5 text-xs font-semibold text-muted-foreground">
            <span>{group.section}</span>
            <span>
              {group.changes.filter((change) => selected.includes(change.id)).length} of {group.changes.length}
            </span>
          </div>
          {group.changes.map((change) => {
            const id = `autofill-${change.id}`;
            return (
              <div
                key={change.id}
                className="grid grid-cols-[16px_minmax(0,1fr)] gap-x-2.5 border-t py-2.5 first-of-type:border-t-0"
              >
                <Checkbox
                  id={id}
                  className="mt-0.5"
                  checked={selected.includes(change.id)}
                  onCheckedChange={(checked) => onToggle(change.id, checked === true)}
                />
                <div className="min-w-0">
                  <Label htmlFor={id} className="mb-1.5 font-semibold">
                    {change.label}
                  </Label>
                  <Values change={change} />
                </div>
              </div>
            );
          })}
        </section>
      ))}
      {matches.length > 0 && (
        <p className="mt-3 flex items-center gap-2 text-[13px] text-muted-foreground">
          <IconCheck size={14} aria-hidden="true" />
          {matches.join(", ")}: match
        </p>
      )}
    </div>
  );
}

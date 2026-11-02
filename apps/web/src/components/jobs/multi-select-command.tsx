"use client";

import { ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Option = { value: string; label: string };

/** Trigger chips beyond this are collapsed into a "+N" pill -- same shape as the "+4"/"+8" overflow pills on a
 *  posting's own skill badges. Without a cap, enough long selections (company names run long) force the button
 *  wider than the sidebar, which has no scroll of its own, so the overflow just bled into the job list next to it. */
const MAX_VISIBLE_CHIPS = 3;

/** A searchable multi-select for a known, closed list of options -- Countries and Skip companies on the filter
 *  sidebar. Replaces typing free text against an unknown set (the owner had no way to see which countries or
 *  companies were valid, or already picked, without a round trip). Selecting an option never closes the popover,
 *  since picking more than one is the point. A selected option is pinned to its own "Selected" group at the top of
 *  the list, so removing one never means scrolling through the full list again to find it. */
export function MultiSelectCommand({
  label,
  values,
  options,
  placeholder,
  searchPlaceholder,
  emptyText,
  onChange,
}: {
  label: string;
  values: string[];
  options: Option[];
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const labelFor = (value: string) => options.find((option) => option.value === value)?.label ?? value;
  const selectedOptions = options.filter((option) => values.includes(option.value));
  const otherOptions = options.filter((option) => !values.includes(option.value));
  const visibleChips = values.slice(0, MAX_VISIBLE_CHIPS);
  const hiddenChipCount = values.length - visibleChips.length;

  function toggle(value: string) {
    onChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  }

  return (
    <div className="grid gap-1.5">
      <Label className="mb-0">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            aria-expanded={open}
            className="h-auto min-h-9 w-full min-w-0 justify-between gap-2 py-1.5 font-normal"
          >
            <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-left">
              {values.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                <>
                  {visibleChips.map((value) => (
                    <span
                      key={value}
                      className="max-w-40 truncate rounded-full border border-input bg-background px-2 py-0.5 text-xs text-foreground"
                    >
                      {labelFor(value)}
                    </span>
                  ))}
                  {hiddenChipCount > 0 && (
                    <span className="rounded-full border border-input bg-background px-2 py-0.5 text-xs text-muted-foreground">
                      +{hiddenChipCount}
                    </span>
                  )}
                </>
              )}
            </span>
            <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              {selectedOptions.length > 0 && (
                <CommandGroup heading="Selected">
                  {selectedOptions.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.label}
                      data-checked={true}
                      onSelect={() => toggle(option.value)}
                    >
                      {option.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              <CommandGroup heading={selectedOptions.length > 0 ? "All" : undefined}>
                {otherOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    data-checked={false}
                    onSelect={() => toggle(option.value)}
                  >
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

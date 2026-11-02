"use client";

import { ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Option = { value: string; label: string };

/** A searchable multi-select for a known, closed list of options -- Countries and Skip companies on the filter
 *  sidebar. Replaces typing free text against an unknown set (the owner had no way to see which countries or
 *  companies were valid, or already picked, without a round trip). Selecting an option never closes the popover,
 *  since picking more than one is the point. */
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
            className="h-auto min-h-9 w-full justify-between gap-2 py-1.5 font-normal"
          >
            <span className="flex flex-1 flex-wrap items-center gap-1 text-left">
              {values.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                values.map((value) => (
                  <span
                    key={value}
                    className="rounded-full border border-input bg-background px-2 py-0.5 text-xs text-foreground"
                  >
                    {labelFor(value)}
                  </span>
                ))
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
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    data-checked={values.includes(option.value)}
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

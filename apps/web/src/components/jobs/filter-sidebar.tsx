"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "@/components/ui/toaster";
import { activeFilterChips } from "@/features/jobs/active-filter-chips";
import type { JobPreferences, JobType, Seniority, WorkSetup } from "@/features/jobs/preferences-store";
import { send } from "@/lib/api-client";

// The filter sidebar replaces the old Settings page (docs/mockups/Jobs redesign.html, "Filter sidebar / Applied"):
// the same job_preferences fields, always visible on /jobs instead of a page away. Every field saves itself as
// soon as it changes -- there's no separate Save step, matching the reference. Specialization (roles) isn't here;
// it only ever appears on the onboarding empty state.

const JOB_TYPE_OPTIONS: { value: JobType; label: string }[] = [
  { value: "full_time", label: "Full time" },
  { value: "part_time", label: "Part time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
  { value: "temporary", label: "Temporary" },
];

const WORK_SETUP_OPTIONS: { value: WorkSetup; label: string }[] = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "on_site", label: "On site" },
];

const SENIORITY_OPTIONS: { value: Seniority; label: string }[] = [
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead" },
];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function ChipField({
  label,
  values,
  placeholder,
  onChange,
}: {
  label: string;
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
      <Label className="mb-0">{label}</Label>
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

export function FilterSidebar({
  preferences,
  search,
  onSearchChange,
}: {
  preferences: JobPreferences;
  search: string;
  onSearchChange: (value: string) => void;
}) {
  const router = useRouter();
  const [minimumPay, setMinimumPay] = useState(preferences.minimumPay === null ? "" : String(preferences.minimumPay));
  const [maximumPay, setMaximumPay] = useState(preferences.maximumPay === null ? "" : String(preferences.maximumPay));

  async function save(changes: Partial<JobPreferences>) {
    try {
      await send("/api/jobs/preferences", "PUT", { ...preferences, ...changes });
      router.refresh();
    } catch (error) {
      toast({ tone: "error", title: error instanceof Error ? error.message : "Couldn't save. Try again" });
    }
  }

  function clearAll() {
    void save({
      minimumPay: null,
      maximumPay: null,
      jobTypes: JOB_TYPE_OPTIONS.map((o) => o.value),
      workSetups: WORK_SETUP_OPTIONS.map((o) => o.value),
      seniority: SENIORITY_OPTIONS.map((o) => o.value),
      skipWords: [],
      skipCompanies: [],
      agenciesHide: false,
      postedWithinDays: 365,
    });
    setMinimumPay("");
    setMaximumPay("");
  }

  const activeCount = activeFilterChips(preferences).length;

  return (
    <aside className="flex flex-col gap-5 rounded-xl border bg-card p-5">
      <Input
        aria-label="Search titles or companies"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search titles or companies"
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Filters</h2>
          <Badge className="font-mono">{activeCount} active</Badge>
        </div>
        <Button type="button" variant="link" size="xs" onClick={clearAll} className="h-auto p-0">
          Clear all
        </Button>
      </div>

      <div className="grid gap-2">
        <span className="text-sm font-medium">Pay</span>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1">
            <Label className="mb-0 text-xs text-muted-foreground">Minimum</Label>
            <Input
              type="number"
              min={0}
              value={minimumPay}
              onChange={(event) => setMinimumPay(event.target.value)}
              onBlur={() => void save({ minimumPay: minimumPay.trim() === "" ? null : Number(minimumPay) })}
              placeholder="Any"
            />
          </div>
          <div className="grid gap-1">
            <Label className="mb-0 text-xs text-muted-foreground">Maximum</Label>
            <Input
              type="number"
              min={0}
              value={maximumPay}
              onChange={(event) => setMaximumPay(event.target.value)}
              onBlur={() => void save({ maximumPay: maximumPay.trim() === "" ? null : Number(maximumPay) })}
              placeholder="Any"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1">
            <Label className="mb-0 text-xs text-muted-foreground">Currency</Label>
            <Input
              value={preferences.payCurrency}
              maxLength={3}
              onChange={(event) => void save({ payCurrency: event.target.value.toUpperCase() })}
            />
          </div>
          <div className="grid gap-1">
            <Label className="mb-0 text-xs text-muted-foreground">Period</Label>
            <NativeSelect
              value={preferences.payPeriod}
              onChange={(event) => void save({ payPeriod: event.target.value as JobPreferences["payPeriod"] })}
            >
              <NativeSelectOption value="hour">Per hour</NativeSelectOption>
              <NativeSelectOption value="day">Per day</NativeSelectOption>
              <NativeSelectOption value="week">Per week</NativeSelectOption>
              <NativeSelectOption value="month">Per month</NativeSelectOption>
              <NativeSelectOption value="year">Per year</NativeSelectOption>
            </NativeSelect>
          </div>
        </div>
      </div>

      <div className="grid gap-2">
        <span className="text-sm font-medium">Job type</span>
        <div className="grid gap-1.5">
          {JOB_TYPE_OPTIONS.map((option) => {
            const id = `sidebar-job-type-${option.value}`;
            return (
              <div key={option.value} className="flex items-center gap-1.5">
                <Checkbox
                  id={id}
                  checked={preferences.jobTypes.includes(option.value)}
                  onCheckedChange={() => void save({ jobTypes: toggle(preferences.jobTypes, option.value) })}
                />
                <Label htmlFor={id} className="mb-0 font-normal">
                  {option.label}
                </Label>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-2">
        <span className="text-sm font-medium">Work setup</span>
        <ToggleGroup
          type="multiple"
          variant="outline"
          spacing={0}
          value={preferences.workSetups}
          onValueChange={(value) => void save({ workSetups: value as WorkSetup[] })}
        >
          {WORK_SETUP_OPTIONS.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value}>
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="grid gap-2">
        <span className="text-sm font-medium">Seniority</span>
        <ToggleGroup
          type="multiple"
          variant="outline"
          spacing={0}
          value={preferences.seniority}
          onValueChange={(value) => void save({ seniority: value as Seniority[] })}
        >
          {SENIORITY_OPTIONS.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value}>
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <ChipField
        label="Skip words"
        values={preferences.skipWords}
        placeholder="Add a word"
        onChange={(skipWords) => void save({ skipWords })}
      />
      <ChipField
        label="Skip companies"
        values={preferences.skipCompanies}
        placeholder="Add a company"
        onChange={(skipCompanies) => void save({ skipCompanies })}
      />

      <div className="grid gap-2">
        <span className="text-sm font-medium">Agencies</span>
        <ToggleGroup
          type="single"
          variant="outline"
          spacing={0}
          value={preferences.agenciesHide ? "hide" : "show"}
          onValueChange={(value) => value && void save({ agenciesHide: value === "hide" })}
        >
          <ToggleGroupItem value="show">Show</ToggleGroupItem>
          <ToggleGroupItem value="hide">Hide</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="grid gap-1.5">
        <Label className="mb-0">Posted within</Label>
        <NativeSelect
          value={String(preferences.postedWithinDays)}
          onChange={(event) => void save({ postedWithinDays: Number(event.target.value) })}
          className="w-auto"
        >
          <NativeSelectOption value="7">7 days</NativeSelectOption>
          <NativeSelectOption value="14">14 days</NativeSelectOption>
          <NativeSelectOption value="30">30 days</NativeSelectOption>
          <NativeSelectOption value="90">90 days</NativeSelectOption>
          <NativeSelectOption value="365">Anytime</NativeSelectOption>
        </NativeSelect>
      </div>
    </aside>
  );
}

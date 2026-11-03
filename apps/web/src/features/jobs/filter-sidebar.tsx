"use client";

import { Check, UserRound } from "lucide-react";
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
import { countryOptions } from "@/features/jobs/country-codes";
import type { JobPreferences, JobType, Seniority, WorkSetup } from "@/features/jobs/preferences-store";
import { send } from "@/lib/api-client";
import { ChipField } from "./chip-field";
import { MultiSelectCommand } from "./multi-select-command";

const COUNTRY_OPTIONS = countryOptions();

// The filter sidebar replaces the old Settings page (docs/mockups/Jobs redesign.html, "Filter sidebar / Applied"):
// the same job_preferences fields, always visible on /jobs instead of a page away. Every field saves itself as
// soon as it changes -- there's no separate Save step, matching the reference. Roles (the Onboarding frame's
// "Specialization" block, docs/mockups/jobs-redesign-canvas/Onboarding.dc.html) moved here on 3 Nov 2026 -- that
// frame's own chrome is a stale pre-single-entry-point shell, but there's no other screen left to edit roles from
// since onboarding isn't a separate step anymore, and the Overview's "Roles: None yet" row had no action at all.

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

export function FilterSidebar({
  preferences,
  derivedRoles,
  companies,
  search,
  onSearchChange,
}: {
  preferences: JobPreferences;
  /** Roles read fresh from the Profile headline and last two titles (`roles.ts`) -- what "Import from Profile"
   *  adds, and what's actually searched when `preferences.roles` is empty. */
  derivedRoles: string[];
  /** Every distinct company name from the owner's own postings, for the Skip companies search list. */
  companies: string[];
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
      countries: [],
      skipWords: [],
      skipCompanies: [],
      agenciesHide: false,
      postedWithinDays: 365,
    });
    setMinimumPay("");
    setMaximumPay("");
  }

  const activeCount = activeFilterChips(preferences).length;
  const newFromProfile = derivedRoles.filter((role) => !preferences.roles.includes(role));

  return (
    <aside id="filters" className="flex flex-col gap-5 rounded-xl border bg-card p-5">
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">Roles</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={newFromProfile.length === 0}
            onClick={() => void save({ roles: [...preferences.roles, ...newFromProfile] })}
          >
            <UserRound aria-hidden="true" />
            Import from Profile
          </Button>
        </div>
        <ChipField values={preferences.roles} placeholder="Add a role" onChange={(roles) => void save({ roles })} />
        {preferences.roles.length === 0 && (
          <span className="text-xs text-muted-foreground">
            {derivedRoles.length > 0
              ? "Searching your Profile headline and last two titles until you add one"
              : "Add a role, or add a headline on Profile so Jobs can suggest one"}
          </span>
        )}
      </div>

      <Input
        aria-label="Search titles or companies"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search titles or companies"
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Filters</h2>
          <Badge>{activeCount} active</Badge>
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
          value={preferences.workSetups}
          onValueChange={(value) => void save({ workSetups: value as WorkSetup[] })}
          className="h-auto w-full flex-wrap"
        >
          {WORK_SETUP_OPTIONS.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value} className="group gap-1">
              <Check className="hidden size-3.5 group-data-[state=on]:inline-block" />
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
          value={preferences.seniority}
          onValueChange={(value) => void save({ seniority: value as Seniority[] })}
          className="h-auto w-full flex-wrap"
        >
          {SENIORITY_OPTIONS.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value} className="group gap-1">
              <Check className="hidden size-3.5 group-data-[state=on]:inline-block" />
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <MultiSelectCommand
        label="Countries"
        values={preferences.countries}
        options={COUNTRY_OPTIONS}
        placeholder="Any country"
        searchPlaceholder="Search countries"
        emptyText="No country matches"
        onChange={(countries) => void save({ countries })}
      />

      <ChipField
        label="Skip words"
        values={preferences.skipWords}
        placeholder="Add a word"
        onChange={(skipWords) => void save({ skipWords })}
      />
      <MultiSelectCommand
        label="Skip companies"
        values={preferences.skipCompanies}
        options={companies.map((company) => ({ value: company, label: company }))}
        placeholder="None skipped"
        searchPlaceholder="Search companies"
        emptyText="No company matches"
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
          className="w-full"
        >
          <ToggleGroupItem value="show" className="group flex-1 gap-1">
            <Check className="hidden size-3.5 group-data-[state=on]:inline-block" />
            Show
          </ToggleGroupItem>
          <ToggleGroupItem value="hide" className="group flex-1 gap-1">
            <Check className="hidden size-3.5 group-data-[state=on]:inline-block" />
            Hide
          </ToggleGroupItem>
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

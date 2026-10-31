"use client";

import { useState } from "react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import type { JobPreferences, JobType, PayPeriod, WorkSetup } from "@/features/jobs/preferences-store";
import type { ScraperState } from "@/features/jobs/scraper-state";
import { send } from "@/lib/api-client";

const PAY_PERIOD_OPTIONS: { value: PayPeriod; label: string }[] = [
  { value: "hour", label: "Hour" },
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

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
  { value: "on_site", label: "On-site" },
];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function sourceStateBadge(state: ScraperState | null) {
  if (state?.blockedUntil && state.blockedUntil > new Date()) {
    const until = state.blockedUntil.toLocaleString("en", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    return <Badge variant="destructive">Blocked until {until}</Badge>;
  }
  return <Badge variant="secondary">Running</Badge>;
}

function linesToList(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function JobsSettingsPage({
  email,
  roles,
  preferences,
  linkedInState,
  indeedState,
}: {
  email: string;
  roles: string[];
  preferences: JobPreferences;
  linkedInState: ScraperState | null;
  indeedState: ScraperState | null;
}) {
  const [skipWords, setSkipWords] = useState(preferences.skipWords.join("\n"));
  const [skipCompanies, setSkipCompanies] = useState(preferences.skipCompanies.join("\n"));
  const [postedWithinDays, setPostedWithinDays] = useState(String(preferences.postedWithinDays));
  const [minimumPay, setMinimumPay] = useState(preferences.minimumPay === null ? "" : String(preferences.minimumPay));
  const [payCurrency, setPayCurrency] = useState(preferences.payCurrency);
  const [payPeriod, setPayPeriod] = useState<PayPeriod>(preferences.payPeriod);
  const [jobTypes, setJobTypes] = useState<JobType[]>(preferences.jobTypes);
  const [workSetups, setWorkSetups] = useState<WorkSetup[]>(preferences.workSetups);
  const [agenciesHide, setAgenciesHide] = useState(preferences.agenciesHide);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await send("/api/jobs/preferences", "PUT", {
        skipWords: linesToList(skipWords),
        skipCompanies: linesToList(skipCompanies),
        postedWithinDays: Number(postedWithinDays),
        minimumPay: minimumPay.trim() === "" ? null : Number(minimumPay),
        payCurrency,
        payPeriod,
        jobTypes,
        workSetups,
        agenciesHide,
      });
      toast({ tone: "success", title: "Settings saved" });
    } catch (error) {
      toast({ tone: "error", title: error instanceof Error ? error.message : "Couldn't save. Try again" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <WorkspaceShell email={email} active="jobs">
      <div className="mx-auto min-h-[calc(100vh-88px)] w-full max-w-5xl px-page pt-page pb-section">
        <h1 className="border-b pb-block font-heading text-2xl leading-tight font-semibold tracking-tight">Settings</h1>

        <section className="mt-6 grid gap-3 rounded-lg border p-4">
          <h2 className="text-sm font-semibold">Roles</h2>
          <p className="text-xs text-muted-foreground">From the Profile headline and last two job titles.</p>
          <div className="flex flex-wrap gap-1.5">
            {roles.length ? (
              roles.map((role) => (
                <span key={role} className="rounded-full border px-2.5 py-1 text-xs">
                  {role}
                </span>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">Add a headline on Profile to see roles here</p>
            )}
          </div>
        </section>

        <section className="mt-6 grid gap-3 rounded-lg border p-4">
          <h2 className="text-sm font-semibold">Sources</h2>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">LinkedIn</span>
            {sourceStateBadge(linkedInState)}
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">Indeed</span>
            {sourceStateBadge(indeedState)}
          </div>
        </section>

        <section className="mt-6 grid gap-4 rounded-lg border p-4">
          <h2 className="text-sm font-semibold">Filters</h2>
          <div className="grid gap-1.5">
            <Label htmlFor="skip-words">Skip words</Label>
            <span className="text-xs text-muted-foreground">
              One per line. A title matching any of these is filtered out.
            </span>
            <Textarea
              id="skip-words"
              value={skipWords}
              onChange={(event) => setSkipWords(event.target.value)}
              className="min-h-20"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="skip-companies">Skip companies</Label>
            <span className="text-xs text-muted-foreground">
              One per line. A company matching any of these is filtered out.
            </span>
            <Textarea
              id="skip-companies"
              value={skipCompanies}
              onChange={(event) => setSkipCompanies(event.target.value)}
              className="min-h-20"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="posted-within">Posted within</Label>
            <span className="text-xs text-muted-foreground">Days. A posting older than this is filtered out.</span>
            <Input
              id="posted-within"
              type="number"
              min={0}
              step={1}
              value={postedWithinDays}
              onChange={(event) => setPostedWithinDays(event.target.value)}
              className="w-24"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="minimum-pay">Minimum pay</Label>
            <span className="text-xs text-muted-foreground">
              Empty means no minimum. A posting's own stated pay is converted into this currency before checking
            </span>
            <div className="flex items-center gap-2">
              <Input
                id="minimum-pay"
                type="number"
                min={0}
                value={minimumPay}
                onChange={(event) => setMinimumPay(event.target.value)}
                placeholder="No minimum"
                className="w-32"
              />
              <Input
                aria-label="Pay currency"
                value={payCurrency}
                onChange={(event) => setPayCurrency(event.target.value)}
                className="w-20"
                maxLength={3}
              />
              <span className="text-sm text-muted-foreground">per</span>
              <NativeSelect
                aria-label="Pay period"
                value={payPeriod}
                onChange={(event) => setPayPeriod(event.target.value as PayPeriod)}
                className="w-28"
              >
                {PAY_PERIOD_OPTIONS.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          </div>
          <div className="grid gap-1.5">
            <span className="text-sm font-medium">Job type</span>
            <span className="text-xs text-muted-foreground">A posting outside these is filtered out</span>
            <div className="flex flex-wrap gap-4">
              {JOB_TYPE_OPTIONS.map((option) => {
                const id = `job-type-${option.value}`;
                return (
                  <div key={option.value} className="flex items-center gap-2">
                    <Checkbox
                      id={id}
                      checked={jobTypes.includes(option.value)}
                      onCheckedChange={() => setJobTypes((current) => toggle(current, option.value))}
                    />
                    <Label htmlFor={id} className="font-normal">
                      {option.label}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="grid gap-1.5">
            <span className="text-sm font-medium">Work setup</span>
            <span className="text-xs text-muted-foreground">A posting outside these is filtered out</span>
            <div className="flex flex-wrap gap-4">
              {WORK_SETUP_OPTIONS.map((option) => {
                const id = `work-setup-${option.value}`;
                return (
                  <div key={option.value} className="flex items-center gap-2">
                    <Checkbox
                      id={id}
                      checked={workSetups.includes(option.value)}
                      onCheckedChange={() => setWorkSetups((current) => toggle(current, option.value))}
                    />
                    <Label htmlFor={id} className="font-normal">
                      {option.label}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Country</Label>
            <span className="text-xs text-muted-foreground">
              A posting that states it's closed to your Profile's country is filtered out; one that doesn't say is never
              filtered for this. Set in Profile, not here
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="grid gap-0.5">
              <Label htmlFor="agencies-hide">Hide recruiting agencies</Label>
              <span className="text-xs text-muted-foreground">Postings from a staffing agency, not the employer</span>
            </div>
            <Switch id="agencies-hide" checked={agenciesHide} onCheckedChange={setAgenciesHide} />
          </div>
          <Button type="button" disabled={busy} onClick={() => void save()} className="w-fit">
            Save settings
          </Button>
        </section>
      </div>
    </WorkspaceShell>
  );
}

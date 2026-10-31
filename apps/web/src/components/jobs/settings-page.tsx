"use client";

import { useState } from "react";
import { IconCopy } from "@tabler/icons-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import type { JobPreferences } from "@/features/jobs/preferences-store";
import { alertKeywords } from "@/features/jobs/roles";
import type { ScraperState } from "@/features/jobs/scraper-state";
import { send } from "@/lib/api-client";

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

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast({ tone: "success", title: "Alert keywords copied" });
  } catch {
    toast({ tone: "error", title: "Couldn't copy. Select it and copy" });
  }
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
  forwardingAddress,
  preferences,
  linkedInState,
}: {
  email: string;
  roles: string[];
  forwardingAddress: string | undefined;
  preferences: JobPreferences;
  linkedInState: ScraperState | null;
}) {
  const [skipWords, setSkipWords] = useState(preferences.skipWords.join("\n"));
  const [skipCompanies, setSkipCompanies] = useState(preferences.skipCompanies.join("\n"));
  const [postedWithinDays, setPostedWithinDays] = useState(String(preferences.postedWithinDays));
  const [busy, setBusy] = useState(false);
  const keywords = alertKeywords(roles);

  async function save() {
    setBusy(true);
    try {
      await send("/api/jobs/preferences", "PUT", {
        skipWords: linesToList(skipWords),
        skipCompanies: linesToList(skipCompanies),
        postedWithinDays: Number(postedWithinDays),
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
          {roles.length > 0 && (
            <InputGroup>
              <InputGroupInput readOnly value={keywords} aria-label="Alert keywords" className="font-mono text-xs" />
              <InputGroupAddon align="inline-end">
                <InputGroupButton onClick={() => void copy(keywords)}>
                  <IconCopy aria-hidden="true" />
                  Copy
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          )}
        </section>

        <section className="mt-6 grid gap-3 rounded-lg border p-4">
          <h2 className="text-sm font-semibold">Forwarding address</h2>
          {forwardingAddress ? (
            <InputGroup>
              <InputGroupInput
                readOnly
                value={forwardingAddress}
                aria-label="Forwarding address"
                className="font-mono text-xs"
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton onClick={() => void copy(forwardingAddress)}>
                  <IconCopy aria-hidden="true" />
                  Copy
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          ) : (
            <p className="text-xs text-muted-foreground">Set JOBS_INBOUND_ADDRESS to turn this on</p>
          )}
        </section>

        <section className="mt-6 grid gap-3 rounded-lg border p-4">
          <h2 className="text-sm font-semibold">Sources</h2>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">LinkedIn</span>
            {sourceStateBadge(linkedInState)}
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
          <Button type="button" disabled={busy} onClick={() => void save()} className="w-fit">
            Save settings
          </Button>
        </section>
      </div>
    </WorkspaceShell>
  );
}

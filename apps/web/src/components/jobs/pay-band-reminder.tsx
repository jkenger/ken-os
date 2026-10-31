"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import type { PayBandSuggestion } from "@/features/jobs/pay-band-suggestion";
import { send } from "@/lib/api-client";

// A reminder, not an automatic filter (docs/product/job-finder.md): pay is only ever filtered once the owner
// confirms a band, here or in Settings -- never silently, since a hidden posting with no visible reason would be
// confusing the same way an unstated Countries match was.

export function PayBandReminder({ suggestion }: { suggestion: PayBandSuggestion }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [applied, setApplied] = useState(false);

  if (applied) return null;

  async function apply() {
    setBusy(true);
    try {
      await send("/api/jobs/preferences", "PUT", {
        skipWords: [],
        skipCompanies: [],
        postedWithinDays: 14,
        minimumPay: suggestion.minimumPay,
        maximumPay: suggestion.maximumPay,
        payCurrency: suggestion.payCurrency,
        payPeriod: suggestion.payPeriod,
        jobTypes: ["full_time", "contract"],
        workSetups: ["remote"],
        agenciesHide: false,
      });
      toast({ tone: "success", title: "Pay filter set" });
      setApplied(true);
      router.refresh();
    } catch (error) {
      toast({ tone: "error", title: error instanceof Error ? error.message : "Couldn't save. Try again" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
      <div className="grid gap-1">
        <span className="text-sm font-medium">Pay filter not set up</span>
        <span className="text-xs text-muted-foreground">
          PH/ASEAN roles typically run {suggestion.payCurrency} {suggestion.minimumPay.toLocaleString()}–
          {suggestion.maximumPay.toLocaleString()} per {suggestion.payPeriod}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Link href="/jobs/settings" className="text-xs text-muted-foreground underline underline-offset-2">
          Open Settings
        </Link>
        <Button type="button" size="sm" disabled={busy} onClick={() => void apply()}>
          Use this range
        </Button>
      </div>
    </div>
  );
}

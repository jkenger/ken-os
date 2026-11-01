"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import type { PayBandSuggestion } from "@/features/jobs/pay-band-suggestion";
import type { JobPreferences } from "@/features/jobs/preferences-store";
import { send } from "@/lib/api-client";

// A reminder, not an automatic filter (docs/product/job-finder.md): pay is only ever filtered once the owner
// confirms a band, here or in the filter sidebar -- never silently, since a hidden posting with no visible reason
// would be confusing the same way an unstated Countries match was. Applying it only changes the pay fields --
// every other stored preference (roles, skip words, job type, ...) is sent back unchanged.

export function PayBandReminder({
  suggestion,
  preferences,
}: {
  suggestion: PayBandSuggestion;
  preferences: JobPreferences;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [applied, setApplied] = useState(false);

  if (applied) return null;

  async function apply() {
    setBusy(true);
    try {
      await send("/api/jobs/preferences", "PUT", {
        ...preferences,
        minimumPay: suggestion.minimumPay,
        maximumPay: suggestion.maximumPay,
        payCurrency: suggestion.payCurrency,
        payPeriod: suggestion.payPeriod,
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
      <Button type="button" size="sm" disabled={busy} onClick={() => void apply()} className="shrink-0">
        Use this range
      </Button>
    </div>
  );
}

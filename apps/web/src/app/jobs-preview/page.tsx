"use client";

import { useState } from "react";
import { IconX } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DismissReasonPopover } from "@/components/jobs/dismiss-reason-popover";
import { DismissedEmptyState } from "@/components/jobs/dismissed-empty-state";
import { DotSeparator } from "@/components/dot-separator";

/** Scratch preview for two Jobs states not yet in Paper: the Dismissed empty state and the
 *  Dismiss-reason picker. Not part of the shipped app; safe to delete once reviewed. */
export default function JobsPreviewPage() {
  const [lastDismissed, setLastDismissed] = useState<string | null>(null);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 bg-background px-6 py-10 font-sans">
      <section className="flex flex-col gap-3">
        <h1 className="text-lg font-semibold text-foreground">Dismissed: empty state</h1>
        <DismissedEmptyState />
      </section>

      <section className="flex flex-col gap-3">
        <h1 className="text-lg font-semibold text-foreground">Posting panel header: Dismiss reason picker</h1>
        <div className="grid gap-2.5 rounded-lg border-b border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary font-mono text-primary-foreground">92</Badge>
            <Badge variant="outline">LinkedIn</Badge>
            <div className="ml-auto flex items-center gap-1.5">
              <DismissReasonPopover
                onDismiss={(reason) => setLastDismissed(reason)}
                trigger={
                  <Button variant="destructive" size="sm">
                    Dismiss
                  </Button>
                }
              />
              <Button variant="ghost" size="icon-sm" aria-label="Close">
                <IconX aria-hidden="true" />
              </Button>
            </div>
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Senior Frontend Engineer</h2>
          <p className="text-sm text-muted-foreground">
            Acme Inc
            <DotSeparator />
            Remote
            <DotSeparator />
            US
          </p>
        </div>
        {lastDismissed && (
          <p className="text-sm text-muted-foreground">
            Last dismiss reason captured: <span className="font-medium text-foreground">{lastDismissed}</span>
          </p>
        )}
      </section>
    </div>
  );
}

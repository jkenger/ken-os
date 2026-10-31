"use client";

import { IconArrowUpRight, IconCopy } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { toast } from "@/components/ui/toaster";
import { SETUP_STEPS, forwardingAddressStatus } from "@/features/jobs/setup";

// Setup checklist before the first posting arrives (docs/product/job-finder.md): the forwarding address, the Gmail
// filter, and each site's alerts. Only the address has a state the app can know; the rest happen outside Loots, so
// those steps carry no Done badge.

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast({ tone: "success", title: "Address copied" });
  } catch {
    toast({ tone: "error", title: "Couldn't copy the address. Select it and copy" });
  }
}

export function SetupChecklist({ forwardingAddress }: { forwardingAddress: string | undefined }) {
  const status = forwardingAddressStatus(forwardingAddress);

  return (
    <div className="rounded-lg border">
      <section className="grid grid-cols-[1.75rem_1fr] gap-x-3 border-b p-4">
        <span
          aria-hidden="true"
          className="flex size-7 items-center justify-center rounded-full border text-xs font-semibold"
        >
          1
        </span>
        <div className="grid min-w-0 gap-3">
          <div className="flex min-h-7 flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Copy the forwarding address</h3>
            <Badge variant={status.configured ? "secondary" : "outline"}>
              {status.configured ? "Ready" : "Not configured"}
            </Badge>
          </div>
          {status.configured ? (
            <InputGroup>
              <InputGroupInput
                readOnly
                value={status.address}
                aria-label="Forwarding address"
                className="font-mono text-xs"
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton onClick={() => void copy(status.address)}>
                  <IconCopy aria-hidden="true" />
                  Copy
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          ) : (
            <p className="text-xs text-muted-foreground">Set JOBS_INBOUND_ADDRESS to turn this on</p>
          )}
        </div>
      </section>
      {SETUP_STEPS.map((step, index) => (
        <section key={step.id} className="grid grid-cols-[1.75rem_1fr] gap-x-3 border-b p-4 last:border-b-0">
          <span
            aria-hidden="true"
            className="flex size-7 items-center justify-center rounded-full border text-xs font-semibold"
          >
            {index + 2}
          </span>
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="grid min-w-0 gap-1">
              <h3 className="text-sm font-semibold">{step.title}</h3>
              <p className="text-xs text-muted-foreground">{step.detail}</p>
            </div>
            <Button asChild variant="outline" size="icon-sm" className="shrink-0" aria-label={`Open ${step.title}`}>
              <a href={step.href} target="_blank" rel="noopener noreferrer">
                <IconArrowUpRight aria-hidden="true" />
              </a>
            </Button>
          </div>
        </section>
      ))}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Copy, FileText } from "lucide-react";
import { Button, ButtonEndIcon } from "@/components/ui/button";
import { DisclosureSummary } from "@/components/ui/disclosure-summary";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkspaceShell } from "@/components/workspace-shell";

const handoffText = `KEN OS PROJECT MEMORY — SAMPLE HANDOFF
This is illustrative preview content, not a stored or approved Project Memory record.

Confirmed choices
- Google Drive remains the source of truth for the selected resume. Source: Resume hub / How it works.
- Manrope is the heading font and Source Sans 3 is the UI/body font. Source: current Ken OS visual system.

Proposed, not confirmed
- Capture consequential choices when they are made, then reconcile them at task end. This is a proposal from the Project Memory spec.

Open question
- What review cadence should Project Memory use for proposed receipts?

Verify source evidence before treating this preview as a real handoff.`;

const label = "text-[11px] font-bold tracking-[0.15em] text-muted-foreground";

export function ProjectMemoryPreview() {
  const [copyState, setCopyState] = useState<"idle" | "success" | "error">("idle");

  async function copyHandoff() {
    try {
      await navigator.clipboard.writeText(handoffText);
      setCopyState("success");
    } catch {
      setCopyState("error");
    }
  }

  return (
    <WorkspaceShell email="preview@example.invalid" active="memory" preview>
      <div className="mx-auto min-h-[calc(100vh-88px)] w-full max-w-[1320px] border-x border-border">
        <header className="border-b border-border px-5 pt-8 pb-4 sm:px-8 lg:px-10 lg:pt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <p className={label}>PROJECT MEMORY</p>
              <span className="rounded-md bg-secondary px-2.5 py-1 text-[10px] font-bold tracking-[0.11em] text-muted-foreground">SAMPLE DATA</span>
            </div>
            <span className={`${label} hidden sm:inline`}>KEN OS PILOT</span>
          </div>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-[720px]">
              <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-[-0.065em] sm:text-5xl">Pick up where you left off.</h1>
              <p className="mt-3 max-w-[640px] text-base leading-6 text-muted-foreground sm:text-lg sm:leading-7">A concise handoff brief to help your next agent session get up to speed after a model or tool switch.</p>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <Button size="lg" type="button" onClick={() => void copyHandoff()}>
                {copyState === "success" ? "Copied handoff" : "Copy handoff"}
                <ButtonEndIcon>{copyState === "success" ? <Check size={16} /> : <Copy size={16} />}</ButtonEndIcon>
              </Button>
              {copyState !== "idle" && <p className="text-xs text-muted-foreground" role="status">{copyState === "success" ? "Sample brief copied to clipboard." : "Could not copy. Check clipboard permission."}</p>}
            </div>
          </div>
        </header>

        <div className="grid lg:grid-cols-[minmax(0,1.75fr)_minmax(300px,0.85fr)]">
          <div className="min-w-0">
            <section className="scroll-mt-24 border-b border-border px-5 py-8 sm:px-8 lg:px-10" id="decisions" aria-labelledby="confirmed-title">
              <h2 className={label} id="confirmed-title">CONFIRMED DECISIONS</h2>
              <p className="mt-1 mb-2 text-sm leading-5 text-muted-foreground">These choices came from you and should be treated as current.</p>
              <div className="space-y-2">
                <Card>
                  <CardHeader>
                    <CardTitle><h3>Google Drive remains the resume source.</h3></CardTitle>
                    <CardDescription>Ken OS keeps the exact file you choose in Google Drive as your current resume. Its content is not copied into Project Memory.</CardDescription>
                    <CardAction><span className="text-[10px] font-bold tracking-[0.1em] text-muted-foreground">CONFIRMED</span></CardAction>
                  </CardHeader>
                  <CardFooter><Link className="inline-flex items-center gap-2 underline-offset-4 hover:text-foreground hover:underline" href="/design-preview?view=resume#how-it-works"><FileText size={14} aria-hidden="true" />Source: Resume hub → How it works</Link></CardFooter>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle><h3>Manrope + Source Sans 3 is the typography baseline.</h3></CardTitle>
                    <CardDescription>Manrope is used for headings; Source Sans 3 carries interface and body text across Ken OS.</CardDescription>
                    <CardAction><span className="text-[10px] font-bold tracking-[0.1em] text-muted-foreground">CONFIRMED</span></CardAction>
                  </CardHeader>
                  <CardFooter><a className="inline-flex items-center gap-2 underline-offset-4 hover:text-foreground hover:underline" href="#sources"><FileText size={14} aria-hidden="true" />Source: Ken OS visual system</a></CardFooter>
                </Card>
              </div>
            </section>

            <section className="border-b border-border px-5 py-8 sm:px-8 lg:px-10" aria-labelledby="proposed-title">
              <h2 className={label} id="proposed-title">PROPOSED NEXT STEP</h2>
              <p className="mt-1 mb-2 text-sm leading-5 text-muted-foreground">Not yet confirmed. Suggested for your review.</p>
              <Card>
                <CardHeader>
                  <CardTitle><h3>Capture consequential choices at decision time.</h3></CardTitle>
                  <CardDescription>When a meaningful choice is made, record the reason and available evidence then, so a later session can recover it.</CardDescription>
                  <CardAction><span className="text-[10px] font-bold tracking-[0.1em] text-muted-foreground">PROPOSED</span></CardAction>
                </CardHeader>
              </Card>
            </section>

            <section className="scroll-mt-24 border-b border-border px-5 py-8 sm:px-8 lg:px-10" id="open-questions" aria-labelledby="questions-title">
              <h2 className={label} id="questions-title">OPEN QUESTIONS</h2>
              <p className="mt-1 mb-2 text-sm leading-5 text-muted-foreground">Needs your input before the policy is settled.</p>
              <Card>
                <CardHeader>
                  <CardTitle><h3>What review cadence feels right?</h3></CardTitle>
                  <CardDescription>Review each proposed receipt as it arrives, or collect them into a small daily inbox?</CardDescription>
                  <CardAction><span className="text-[10px] font-bold tracking-[0.1em] text-muted-foreground">NEEDS INPUT</span></CardAction>
                </CardHeader>
              </Card>
            </section>
          </div>

          <aside className="min-w-0 border-t border-border lg:border-t-0 lg:border-l" aria-label="About this handoff">
            <section className="border-b border-border px-5 py-8 sm:px-8 lg:px-9">
              <h2 className={label}>ABOUT THIS BRIEF</h2>
              <p className="mt-4 text-base leading-6 text-muted-foreground">A short, source-linked view of what a new agent session needs: current choices, a proposed direction, and the question still open.</p>
              <p className="mt-4 text-base leading-6 text-muted-foreground">This page is a visual preview. Nothing shown here is stored as a Project Memory record.</p>
            </section>
            <section className="border-b border-border px-5 py-8 sm:px-8 lg:px-9">
              <h2 className={label}>LATEST OUTCOME</h2>
              <p className="mt-4 text-base leading-6 text-muted-foreground">The Ken OS shell and typography baseline are ready. Project Memory is the next module being designed.</p>
            </section>
            <section className="scroll-mt-24 border-b border-border px-5 py-8 sm:px-8 lg:px-9" id="sources">
              <h2 className={label}>SOURCES IN THIS BRIEF</h2>
              <details className="group mt-4 text-sm text-muted-foreground">
                <DisclosureSummary className="rounded-md py-1 hover:text-foreground"><FileText size={16} aria-hidden="true" />Resume hub → How it works</DisclosureSummary>
                <p className="pl-6 pt-2 text-xs leading-5">Current workspace UI and the repository guidance in <code>AGENTS.md</code>.</p>
              </details>
              <details className="group mt-3 text-sm text-muted-foreground">
                <DisclosureSummary className="rounded-md py-1 hover:text-foreground"><FileText size={16} aria-hidden="true" />Ken OS visual system</DisclosureSummary>
                <p className="pl-6 pt-2 text-xs leading-5">The selected typography baseline in <code>docs/architecture/starter-standard.md</code> and the current preview.</p>
              </details>
              <p className="mt-6 text-sm leading-6 text-muted-foreground">Only sample content from this personal project is used here. Future receipts will need their own provenance and review.</p>
            </section>
          </aside>
        </div>
      </div>
    </WorkspaceShell>
  );
}

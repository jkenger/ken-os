"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  FileText,
  GitBranch,
  MessagesSquare,
  Minus,
  Plus,
} from "lucide-react";
import { Button, ButtonEndIcon } from "@/components/ui/button";
import { DisclosureSummary } from "@/components/ui/disclosure-summary";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function ComponentExamples() {
  const [actionDone, setActionDone] = useState(false);
  const [name, setName] = useState("");
  const [sourcesOpen, setSourcesOpen] = useState(false);
  return (
    <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-2">
      <section
        className="min-w-0 bg-background p-5 sm:p-6"
        aria-labelledby="button-example-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold tracking-[0.15em] text-muted-foreground">
              01 / ACTIONS
            </p>
            <h3
              className="mt-2 font-display text-lg font-semibold tracking-[-0.04em]"
              id="button-example-title"
            >
              Buttons
            </h3>
          </div>
          <span className="text-xs text-muted-foreground">
            Shared primitive
          </span>
        </div>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">
          One strong action, with quieter choices nearby.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => setActionDone((value) => !value)}
          >
            {actionDone ? "Action complete" : "Primary action"}
            <ButtonEndIcon>
              {actionDone ? <Check size={15} /> : <ArrowUpRight size={15} />}
            </ButtonEndIcon>
          </Button>
          <Button
            variant="outline"
            type="button"
            onClick={() => setActionDone(false)}
          >
            Secondary
          </Button>
          <Button
            variant="ghost"
            type="button"
            onClick={() => setActionDone(false)}
          >
            Quiet
          </Button>
          <Button type="button" disabled>
            Disabled
          </Button>
          <Button type="button" disabled aria-busy="true">
            Working…
          </Button>
        </div>
        <p
          className="mt-4 min-h-5 text-[13px] text-muted-foreground"
          role="status"
        >
          {actionDone
            ? "The sample action completed. Select it again to reset."
            : "Select the primary action to see its feedback state."}
        </p>
      </section>
      <section
        className="min-w-0 bg-background p-5 sm:p-6"
        aria-labelledby="input-example-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold tracking-[0.15em] text-muted-foreground">
              02 / INPUT
            </p>
            <h3
              className="mt-2 font-display text-lg font-semibold tracking-[-0.04em]"
              id="input-example-title"
            >
              Field
            </h3>
          </div>
          <span className="text-xs text-muted-foreground">
            Shared primitive
          </span>
        </div>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">
          Warm border, clear label and visible focus.
        </p>
        <label
          className="mt-5 block text-[13px] font-semibold"
          htmlFor="design-example-name"
        >
          Project name
        </label>
        <Input
          className="mt-2 max-w-sm"
          id="design-example-name"
          placeholder="A new personal project"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <p
          className="mt-2 min-h-5 text-[13px] text-muted-foreground"
          role="status"
        >
          {name ? `Preview name: ${name}` : "Try typing a name."}
        </p>
        <details className="group mt-2 text-[13px] text-muted-foreground">
          <DisclosureSummary className="w-fit rounded-sm underline underline-offset-4 hover:text-foreground">
            Inspect disabled and error states
          </DisclosureSummary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="design-example-disabled" className="mb-1 block">
                Disabled
              </label>
              <Input
                id="design-example-disabled"
                value="Unavailable"
                disabled
                readOnly
              />
            </div>
            <div>
              <label htmlFor="design-example-invalid" className="mb-1 block">
                Needs attention
              </label>
              <Input
                id="design-example-invalid"
                value=""
                placeholder="Required value"
                aria-invalid="true"
                aria-describedby="design-example-error"
                readOnly
              />
              <p
                className="mt-1 text-xs text-destructive"
                id="design-example-error"
              >
                Enter a project name.
              </p>
            </div>
          </div>
        </details>
      </section>
      <section
        className="min-w-0 bg-background p-5 sm:p-6"
        aria-labelledby="card-example-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold tracking-[0.15em] text-muted-foreground">
              03 / REPEATED ITEM
            </p>
            <h3
              className="mt-2 font-display text-lg font-semibold tracking-[-0.04em]"
              id="card-example-title"
            >
              Card
            </h3>
          </div>
          <span className="text-xs text-muted-foreground">
            Shared primitive
          </span>
        </div>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">
          The stock shadcn Card surface and slots, at Ken OS's compact content density.
        </p>
        <Card className="mt-5 max-w-md">
          <CardHeader>
            <CardTitle><h4>A reusable decision card</h4></CardTitle>
            <CardDescription>
              Brief supporting context that can wrap without losing its point.
            </CardDescription>
            <CardAction><span className="text-[10px] font-bold tracking-[0.1em] text-muted-foreground">CURRENT</span></CardAction>
          </CardHeader>
          <CardFooter>Source · Design system</CardFooter>
        </Card>
      </section>
      <section
        className="min-w-0 bg-background p-5 sm:p-6"
        aria-labelledby="panel-example-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold tracking-[0.15em] text-muted-foreground">
              04 / TASK SURFACE
            </p>
            <h3
              className="mt-2 font-display text-lg font-semibold tracking-[-0.04em]"
              id="panel-example-title"
            >
              Feature panel
            </h3>
          </div>
          <span className="text-xs text-muted-foreground">
            Shared primitive
          </span>
        </div>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">
          The same default Card can contain a roomier task surface.
        </p>
        <Card className="mt-5 max-w-md [--card-spacing:--spacing(6)]">
          <CardHeader>
            <CardTitle><h4>Review the source</h4></CardTitle>
            <CardDescription>Next action</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-[15px] leading-6 text-muted-foreground">
              A task surface can reuse Card without introducing a custom density variant.
            </p>
          </CardContent>
        </Card>
      </section>
      <section
        className="min-w-0 bg-background p-5 sm:p-6 lg:col-span-2"
        aria-labelledby="ambient-example-title"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold tracking-[0.15em] text-muted-foreground">
              05 / SURFACE EXPLORATION
            </p>
            <h3
              className="mt-2 font-display text-lg font-semibold tracking-[-0.04em]"
              id="ambient-example-title"
            >
              Ambient light card
            </h3>
          </div>
          <span className="rounded-md border border-border px-2 py-1 text-[11px] font-semibold text-muted-foreground">
            Preview only
          </span>
        </div>
        <p className="mt-1 max-w-[65ch] text-sm leading-5 text-muted-foreground">
          A low-contrast ivory-to-stone gradient that adds depth without turning
          the card into a dark accent.
        </p>
        <div className="mt-5 grid items-start gap-5 md:grid-cols-[minmax(0,440px)_minmax(0,1fr)] md:gap-8">
          <article className="min-h-[190px] rounded-xl border border-[#d6cfc7] bg-[linear-gradient(130deg,#fffdf9_0%,#f4f0e9_48%,#e9e4df_100%)] p-5 text-foreground shadow-[0_12px_28px_-22px_rgba(54,46,39,0.35)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="font-display text-[17px] font-semibold leading-6 tracking-[-0.035em]">
                  Connect project sources
                </h4>
                <p className="mt-1 max-w-[27ch] text-sm leading-5 text-muted-foreground">
                  More context in, better answers out.
                </p>
              </div>
              <button
                type="button"
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#d3ccc4] bg-white/55 text-foreground transition-colors hover:bg-white/85"
                aria-label={
                  sourcesOpen
                    ? "Hide connection preview"
                    : "Show connection preview"
                }
                aria-expanded={sourcesOpen}
                onClick={() => setSourcesOpen((open) => !open)}
              >
                {sourcesOpen ? (
                  <Minus size={16} aria-hidden="true" />
                ) : (
                  <Plus size={16} aria-hidden="true" />
                )}
              </button>
            </div>
            <div
              className="mt-7 flex items-center -space-x-1"
              aria-label="Example sources: Git activity, project documents, and conversations"
            >
              <span
                className="inline-flex size-8 items-center justify-center rounded-lg border border-[#d3ccc4] bg-white/55 text-[#514b45]"
                title="Git activity"
              >
                <GitBranch size={16} aria-hidden="true" />
              </span>
              <span
                className="inline-flex size-8 items-center justify-center rounded-lg border border-[#d3ccc4] bg-white/55 text-[#514b45]"
                title="Project documents"
              >
                <FileText size={16} aria-hidden="true" />
              </span>
              <span
                className="inline-flex size-8 items-center justify-center rounded-lg border border-[#d3ccc4] bg-white/55 text-[#514b45]"
                title="Conversations"
              >
                <MessagesSquare size={16} aria-hidden="true" />
              </span>
            </div>
            {sourcesOpen && (
              <p
                className="mt-5 border-t border-[#d3ccc4] pt-4 text-[13px] leading-5 text-muted-foreground"
                role="status"
              >
                Visual preview only. Connections are not configured here.
              </p>
            )}
          </article>
          <div className="max-w-sm text-[13px] leading-5 text-muted-foreground">
            <p className="font-semibold text-foreground">
              Where it could belong
            </p>
            <p className="mt-1">
              Use on a single integration or agent invitation when the
              surrounding screen is quiet. Keep regular task panels and repeated
              cards flat for contrast.
            </p>
            <p className="mt-3">
              We can promote the gradient to a named surface token after
              reviewing it here.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

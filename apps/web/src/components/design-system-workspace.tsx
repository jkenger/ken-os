import Link from "next/link";
import { ArrowUpRight, Download, FileText, Layers3 } from "lucide-react";
import { Button, ButtonEndIcon } from "@/components/ui/button";
import { DisclosureSummary } from "@/components/ui/disclosure-summary";
import { WorkspaceShell } from "@/components/workspace-shell";
import { ComponentExamples } from "@/features/design-system/examples";
import { designSystem } from "@/features/design-system/contract";

const label = "text-[11px] font-bold tracking-[0.15em] text-muted-foreground";

export function DesignSystemWorkspace({
  email,
  preview = false,
}: {
  email: string;
  preview?: boolean;
}) {
  return (
    <WorkspaceShell email={email} active="design" preview={preview}>
      <div className="mx-auto min-h-[calc(100vh-88px)] w-full max-w-[1320px] border-x border-border">
        <header
          className="border-b border-border px-5 pb-7 pt-8 sm:px-8 lg:px-10 lg:pt-10"
          id="overview"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <p className={label}>DESIGN SYSTEM</p>
              <span className="rounded-md bg-secondary px-2.5 py-1 text-[10px] font-bold tracking-[0.08em] text-muted-foreground">
                {designSystem.statusLabel.toUpperCase()}
              </span>
            </div>
            <span className={label}>VERSION {designSystem.version}</span>
          </div>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-[730px]">
              <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-[-0.065em] sm:text-5xl">
                Design, made repeatable.
              </h1>
              <p className="mt-3 max-w-[680px] text-base leading-6 text-muted-foreground sm:text-lg sm:leading-7">
                The visual language behind Ken OS, shown through the real pieces
                we use—and packaged to try in another personal project.
              </p>
            </div>
            {preview ? (
              <span className="text-xs text-muted-foreground">
                Export requires owner sign-in.
              </span>
            ) : (
              <Button asChild size="lg">
                <a href="/api/design-system/export">
                  Download working skill
                  <ButtonEndIcon>
                    <Download size={15} />
                  </ButtonEndIcon>
                </a>
              </Button>
            )}
          </div>
        </header>

        <section
          className="scroll-mt-20 border-b border-border"
          id="foundations"
          aria-labelledby="foundations-title"
        >
          <div className="px-5 pb-4 pt-6 sm:px-8 lg:px-10">
            <p className={label}>01 / FOUNDATIONS</p>
            <h2
              className="mt-2 font-display text-2xl font-semibold tracking-[-0.05em]"
              id="foundations-title"
            >
              Quiet by design.
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Semantic color, a two-font hierarchy, and density that keeps
              important work easy to scan.
            </p>
          </div>
          <div className="grid border-y border-border md:grid-cols-2 xl:grid-cols-4">
            {designSystem.colors.slice(0, 8).map((color) => (
              <div
                key={color.variable}
                className="min-w-0 border-b border-border p-4 last:border-b-0 md:border-r xl:[&:nth-child(4n)]:border-r-0"
              >
                <div
                  className="h-12 rounded-lg border border-border"
                  style={{ backgroundColor: `var(--${color.variable})` }}
                  aria-hidden="true"
                />
                <div className="mt-3 flex items-baseline justify-between gap-2">
                  <strong className="text-[13px]">{color.label}</strong>
                  <code className="text-xs text-muted-foreground">
                    {color.value}
                  </code>
                </div>
                <p className="mt-1 text-[13px] leading-[18px] text-muted-foreground">
                  {color.use}
                </p>
              </div>
            ))}
          </div>
          <div className="grid lg:grid-cols-2">
            <div className="px-5 py-6 sm:px-8 lg:border-r lg:px-10">
              <p className={label}>TYPE</p>
              <p className="mt-4 font-display text-3xl font-semibold leading-tight tracking-[-0.055em]">
                Manrope makes a point.
              </p>
              <p className="mt-2 text-base leading-6 text-muted-foreground">
                Source Sans 3 carries the explanation. The display face stays
                out of dense body copy.
              </p>
              <div className="mt-5 space-y-2 border-t border-border pt-4">
                {designSystem.typeScale.slice(2, 6).map((item) => (
                  <div
                    key={item.role}
                    className="flex justify-between gap-4 text-[13px]"
                  >
                    <span>{item.role}</span>
                    <span className="text-right text-muted-foreground">
                      {item.desktop}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-border px-5 py-6 sm:px-8 lg:border-t-0 lg:px-10">
              <p className={label}>DENSITY</p>
              <div className="mt-4 space-y-3">
                {designSystem.spacing.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start justify-between gap-4 border-b border-border pb-2 text-[13px]"
                  >
                    <div>
                      <strong className="font-semibold">{item.label}</strong>
                      <p className="text-muted-foreground">{item.use}</p>
                    </div>
                    <span className="shrink-0 text-right text-muted-foreground">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          className="scroll-mt-20 border-b border-border px-5 py-6 sm:px-8 lg:px-10"
          id="components"
          aria-labelledby="components-title"
        >
          <div className="mb-5">
            <p className={label}>02 / COMPONENTS</p>
            <h2
              className="mt-2 font-display text-2xl font-semibold tracking-[-0.05em]"
              id="components-title"
            >
              The pieces we actually use.
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              These examples import the same buttons, cards and input as the
              app. Try the primary action and field; keyboard focus works here
              too.
            </p>
          </div>
          <ComponentExamples />
          <details className="group mt-4 rounded-xl border border-border px-4 py-3 text-sm">
            <DisclosureSummary className="font-semibold">
              Usage rules and anatomy
            </DisclosureSummary>
            <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
              {designSystem.componentRules.map((rule) => (
                <div key={rule.name}>
                  <h3 className="font-display text-base font-semibold">
                    {rule.name}
                  </h3>
                  <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
                    {rule.summary} {rule.details}
                  </p>
                </div>
              ))}
            </div>
          </details>
        </section>

        <section
          className="scroll-mt-20 border-b border-border"
          id="patterns"
          aria-labelledby="patterns-title"
        >
          <div className="px-5 pb-4 pt-6 sm:px-8 lg:px-10">
            <p className={label}>03 / APPLIED PATTERNS</p>
            <h2
              className="mt-2 font-display text-2xl font-semibold tracking-[-0.05em]"
              id="patterns-title"
            >
              Density follows the work.
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Repeated information stays compact; high-stakes tasks receive
              space. These are different uses of one language, not separate
              themes.
            </p>
          </div>
          <div className="grid border-t border-border md:grid-cols-3">
            <Link
              href="/"
              className="group border-b border-border p-5 transition-colors hover:bg-muted/50 md:border-b-0 md:border-r sm:px-8"
            >
              <FileText size={19} strokeWidth={1.7} aria-hidden="true" />
              <h3 className="mt-4 font-display text-base font-semibold">
                Resume hub{" "}
                <ArrowUpRight className="inline size-4 opacity-50 group-hover:opacity-100" />
              </h3>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                Roomy source-file and document-viewing task.
              </p>
              <span className="mt-4 inline-block text-[11px] font-bold tracking-[0.1em] text-muted-foreground">
                SHIPPED
              </span>
            </Link>
            <Link
              href="/skills"
              className="group border-b border-border p-5 transition-colors hover:bg-muted/50 md:border-b-0 md:border-r sm:px-8"
            >
              <Layers3 size={19} strokeWidth={1.7} aria-hidden="true" />
              <h3 className="mt-4 font-display text-base font-semibold">
                Agent skills{" "}
                <ArrowUpRight className="inline size-4 opacity-50 group-hover:opacity-100" />
              </h3>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                Compact library items and a clear management action.
              </p>
              <span className="mt-4 inline-block text-[11px] font-bold tracking-[0.1em] text-muted-foreground">
                SHIPPED
              </span>
            </Link>
            <div className="p-5 sm:px-8">
              <FileText size={19} strokeWidth={1.7} aria-hidden="true" />
              <h3 className="mt-4 font-display text-base font-semibold">
                Project Memory
              </h3>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                Decision cards in a development-only mockup.
              </p>
              <span className="mt-4 inline-block text-[11px] font-bold tracking-[0.1em] text-muted-foreground">
                EXPLORATORY
              </span>
            </div>
          </div>
        </section>

        <section
          className="scroll-mt-20 border-b border-border px-5 py-6 sm:px-8 lg:px-10"
          id="decisions"
          aria-labelledby="decisions-title"
        >
          <p className={label}>04 / DECISIONS</p>
          <h2
            className="mt-2 font-display text-2xl font-semibold tracking-[-0.05em]"
            id="decisions-title"
          >
            Why it looks this way.
          </h2>
          <div className="mt-5 grid gap-2 lg:grid-cols-3">
            {designSystem.decisions.map((decision) => (
              <div
                key={decision.title}
                className="rounded-xl border border-border bg-muted/35 p-4"
              >
                <span className="text-[11px] font-bold tracking-[0.1em] text-muted-foreground">
                  RECORDED {decision.recorded}
                </span>
                <h3 className="mt-2 font-display text-base font-semibold leading-5 tracking-[-0.035em]">
                  {decision.title}
                </h3>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                  {decision.rationale}
                </p>
                <p className="mt-3 text-[13px] leading-[18px] text-muted-foreground">
                  Not chosen: {decision.rejected}.
                </p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[13px] leading-5 text-muted-foreground">
            A new rule starts in the development preview, enters the real
            component and contract after your choice, and becomes approved only
            after gallery review.
          </p>
        </section>

        <section
          className="scroll-mt-20 px-5 py-7 sm:px-8 lg:px-10"
          id="export"
          aria-labelledby="export-title"
        >
          <div className="grid gap-5 rounded-xl border border-border bg-muted/35 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <p className={label}>05 / PORTABLE SKILL</p>
              <h2
                className="mt-2 font-display text-xl font-semibold tracking-[-0.04em]"
                id="export-title"
              >
                Try the system somewhere new.
              </h2>
              <p className="mt-2 max-w-[65ch] text-sm leading-6 text-muted-foreground">
                The ZIP contains SKILL.md and Markdown references. It is a
                working preset, not an approved release; it does not install
                itself or change another project’s dependencies.
              </p>
            </div>
            {preview ? (
              <p className="text-xs text-muted-foreground">
                Owner sign-in required for export.
              </p>
            ) : (
              <Button asChild>
                <a href="/api/design-system/export">
                  Download working ZIP
                  <ButtonEndIcon>
                    <Download size={15} />
                  </ButtonEndIcon>
                </a>
              </Button>
            )}
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}

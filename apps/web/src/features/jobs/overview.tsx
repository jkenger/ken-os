import { CircleCheck, CircleDashed, Clock, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckStatusIcon } from "@/features/jobs/check-status-icon";
import { describeCheckStatus, type CheckStatus } from "@/features/jobs/format-check-status";
import { preferencesSummary } from "@/features/jobs/preferences-summary";
import type { JobPreferences } from "@/features/jobs/preferences-store";
import type { AlertSource } from "@/features/jobs/raw-posting";
import { describeScraperState, type ScraperStatusView } from "@/features/jobs/scraper-status";
import type { ScraperSourceState } from "@/features/jobs/scraper-state";
import { sourceWords } from "@/features/jobs/words";

/** One icon per scraped source's own state (docs/mockups/jobs-scraper-status.md) -- reuses `CheckStatusIcon`'s
 *  vocabulary (`CircleCheck`/`Clock`/`CircleDashed`) since Blocked reads the same as freehire's existing Late:
 *  not actively running right now, whether the cause is scheduler silence or a deliberate 24h backoff. */
function ScraperStatusIcon({ kind }: { kind: ScraperStatusView["kind"] }) {
  if (kind === "running") return <CircleCheck />;
  if (kind === "blocked") return <Clock className="text-muted-foreground" />;
  return <CircleDashed className="text-muted-foreground" strokeDasharray="3.5 3" />;
}

/** freehire has no `job_scraper_state` row (`check-freehire.ts`), so `scraperStates` only ever lists the sources
 *  that actively try to stop scraping -- `sourceWords` falls back to the raw source string for one not yet in
 *  that map (e.g. a source whose display-name entry hasn't landed yet). */
function sourceLabel(source: string): string {
  return sourceWords[source as AlertSource] ?? source;
}

function StatusRow({
  icon,
  title,
  stateWord,
  children,
  caption,
}: {
  icon: ReactNode;
  title: string;
  stateWord: string;
  children: ReactNode;
  caption?: string;
}) {
  return (
    <div className="grid grid-cols-[20px_140px_1fr] items-start gap-3 bg-card p-4">
      <div className="mt-0.5 [&_svg]:size-[18px]">{icon}</div>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <div className="text-xs text-muted-foreground">{stateWord}</div>
      </div>
      <div className="grid gap-1.5">
        {children}
        {caption && <div className="text-xs text-muted-foreground">{caption}</div>}
      </div>
    </div>
  );
}

/** The Setup status panel (docs/mockups/jobs-redesign-canvas/Overview.dc.html) -- used both as the whole
 *  zero-postings state (via `Overview` below) and, expanded from the status strip's toggle, once postings
 *  exist. Same three facts either way: roles, preferences, and whether the pipeline is actually checking. */
export function SetupStatusPanel({
  effectiveRoles,
  preferences,
  checkStatus,
  scraperStates,
}: {
  effectiveRoles: string[];
  preferences: JobPreferences;
  checkStatus: CheckStatus | null;
  scraperStates: ScraperSourceState[];
}) {
  const rolesReady = effectiveRoles.length > 0;
  const prefs = preferencesSummary(preferences);
  const check = describeCheckStatus(checkStatus);
  const checkReady = check.kind === "working";
  const scraperViews = scraperStates.map((state) => ({ source: state.source, view: describeScraperState(state) }));
  const scraperReadyCount = scraperViews.filter(({ view }) => view.kind === "running").length;
  const totalChecks = 3 + scraperViews.length;
  const readyCount = Number(rolesReady) + 1 + Number(checkReady) + scraperReadyCount;

  return (
    <div className="grid gap-5">
      <div className="overflow-hidden rounded-xl border">
        <div className="flex h-11 items-center justify-between border-b bg-card px-5">
          <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Setup status</h2>
          <span className="text-xs text-muted-foreground">
            {readyCount} of {totalChecks} ready
          </span>
        </div>
        <div className="grid gap-px bg-border">
          <StatusRow
            icon={
              rolesReady ? <CircleCheck /> : <CircleDashed className="text-muted-foreground" strokeDasharray="3.5 3" />
            }
            title="Roles"
            stateWord={rolesReady ? "Ready" : "None yet"}
          >
            {rolesReady ? (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {effectiveRoles.map((role) => (
                    <Badge key={role} variant="outline">
                      {role}
                    </Badge>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground">
                  {preferences.roles.length > 0 ? "Edited by you" : "From your Profile headline and last two titles"}
                </div>
              </>
            ) : (
              <div className="text-sm">
                Add a role in{" "}
                <a href="#filters" className="underline">
                  Filters
                </a>
                , or add a headline on Profile so Jobs can suggest one
              </div>
            )}
          </StatusRow>

          <StatusRow icon={<CircleCheck />} title="Preferences" stateWord={prefs.stateWord} caption={prefs.caption}>
            <div className="text-sm">{prefs.line}</div>
          </StatusRow>

          <StatusRow
            icon={<CheckStatusIcon kind={check.kind} />}
            title="Last checked"
            stateWord={check.kind === "never" ? "Never" : check.kind[0]!.toUpperCase() + check.kind.slice(1)}
            caption={
              check.kind === "never"
                ? "The scheduler should call the freehire check every minute. If this stays at Never, the scheduler isn't set up or can't reach Loots"
                : check.kind === "working"
                  ? `Checked ${check.checkCount} time${check.checkCount === 1 ? "" : "s"} since ${check.sinceLabel}`
                  : check.kind === "late"
                    ? "Expected every minute. The scheduler may have stopped"
                    : `${check.reason}${check.lastGoodAgoLabel ? `. Last good check ${check.lastGoodAgoLabel}` : ". No check has ever succeeded"}`
            }
          >
            <div className="text-sm font-medium">
              {check.kind === "never"
                ? "No check has run yet"
                : check.kind === "failing"
                  ? `Last check failed ${check.agoLabel}`
                  : check.agoLabel}
            </div>
          </StatusRow>

          {scraperViews.map(({ source, view }) => (
            <StatusRow
              key={source}
              icon={<ScraperStatusIcon kind={view.kind} />}
              title={sourceLabel(source)}
              stateWord={view.kind === "never" ? "Never" : view.kind === "blocked" ? "Blocked" : "Running"}
              caption={
                view.kind === "never"
                  ? `The scheduler should call the ${sourceLabel(source)} check every minute. If this stays at Never, the scheduler isn't set up or can't reach Loots`
                  : undefined
              }
            >
              <div className="text-sm font-medium">
                {view.kind === "never"
                  ? "No check has run yet"
                  : view.kind === "blocked"
                    ? `Blocked until ${view.untilLabel}`
                    : view.agoLabel
                      ? `Last ran ${view.agoLabel}`
                      : "Running"}
              </div>
            </StatusRow>
          ))}
        </div>
      </div>

      <div className="px-1">
        <Button asChild>
          <a href="#filters">
            <SlidersHorizontal aria-hidden="true" />
            Edit filters
          </a>
        </Button>
      </div>
    </div>
  );
}

/** The zero-postings state (docs/mockups/jobs-redesign-canvas/Overview.dc.html) -- replaces a near-blank page
 *  with what Jobs does and whether it's actually working, since the owner had to go check that for themselves
 *  outside the app before this existed. */
export function Overview({
  effectiveRoles,
  preferences,
  checkStatus,
  scraperStates,
}: {
  effectiveRoles: string[];
  preferences: JobPreferences;
  checkStatus: CheckStatus | null;
  scraperStates: ScraperSourceState[];
}) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-1 px-1">
        <h1 className="text-lg font-semibold tracking-tight">No postings yet</h1>
        <p className="text-sm text-muted-foreground">
          Jobs searches freehire for your roles and scores each posting against your Profile
        </p>
      </div>
      <SetupStatusPanel
        effectiveRoles={effectiveRoles}
        preferences={preferences}
        checkStatus={checkStatus}
        scraperStates={scraperStates}
      />
    </div>
  );
}

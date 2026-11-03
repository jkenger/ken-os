import { CircleCheck, CircleDashed, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckStatusIcon } from "@/features/jobs/check-status-icon";
import { describeCheckStatus, type CheckStatus } from "@/features/jobs/format-check-status";
import { preferencesSummary } from "@/features/jobs/preferences-summary";
import type { JobPreferences } from "@/features/jobs/preferences-store";

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
}: {
  effectiveRoles: string[];
  preferences: JobPreferences;
  checkStatus: CheckStatus | null;
}) {
  const rolesReady = effectiveRoles.length > 0;
  const prefs = preferencesSummary(preferences);
  const check = describeCheckStatus(checkStatus);
  const checkReady = check.kind === "working";
  const readyCount = Number(rolesReady) + 1 + Number(checkReady);

  return (
    <div className="grid gap-5">
      <div className="overflow-hidden rounded-xl border">
        <div className="flex h-11 items-center justify-between border-b bg-card px-5">
          <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Setup status</h2>
          <span className="text-xs text-muted-foreground">{readyCount} of 3 ready</span>
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
}: {
  effectiveRoles: string[];
  preferences: JobPreferences;
  checkStatus: CheckStatus | null;
}) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-1 px-1">
        <h1 className="text-lg font-semibold tracking-tight">No postings yet</h1>
        <p className="text-sm text-muted-foreground">
          Jobs searches freehire for your roles and scores each posting against your Profile
        </p>
      </div>
      <SetupStatusPanel effectiveRoles={effectiveRoles} preferences={preferences} checkStatus={checkStatus} />
    </div>
  );
}

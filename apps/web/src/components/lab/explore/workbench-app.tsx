import Link from "next/link";
import type { ChapterState, Level } from "@ken-os/domain";
import { Button } from "@/components/ui/button";
import type { ProfileView } from "@/features/engineering-lab/profile-store";
import { cn } from "@/lib/utils";
import { Skyline } from "../profile/skyline";
import { depthWords, levelWords } from "../words";
import { Assessed, Definitions, LevelTable, Radar, RoleChoices, sampleTalk } from "./profile-explore";

// Workbench as a tool rather than a page. What changes from the page version, on purpose:
// 1. a compact title bar with status and actions, instead of a hero headline and tagline;
// 2. two panes that fill the screen and scroll on their own, instead of one long page scroll;
// 3. section tabs in the work area, instead of stacked sections with large headings and gaps;
// 4. tighter type and spacing, and plain labels instead of taglines.

export type WorkbenchPane = "shape" | "levels" | "roles" | "radar" | "history" | "definitions";

const panes: { id: WorkbenchPane; name: string }[] = [
  { id: "shape", name: "Shape" },
  { id: "levels", name: "Levels" },
  { id: "roles", name: "Roles" },
  { id: "radar", name: "Radar" },
  { id: "history", name: "Assessments" },
  { id: "definitions", name: "Definitions" },
];

function chapterTitle(id: string, profile: ProfileView) {
  return profile.roadmap.find((step) => step.chapter === id)?.title ?? id;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold">{value}</dd>
    </div>
  );
}

function GuidePane() {
  return (
    <section aria-labelledby="guide-pane-title" className="flex min-h-[420px] flex-col rounded-xl bg-card shadow-panel lg:min-h-0">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold" id="guide-pane-title">Guide</h2>
        <p className="text-xs text-muted-foreground">Uses your real numbers. Suggests; you confirm.</p>
      </div>
      <ol className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-4">
        {sampleTalk.map((message, index) => (
          <li key={index} className={cn("max-w-[92%] rounded-md px-3 py-2 text-sm leading-5", message.role === "owner" ? "ml-auto border border-border" : "bg-muted")}>
            <span className="sr-only">{message.role === "owner" ? "You: " : "Guide: "}</span>{message.text}
          </li>
        ))}
        <li className="rounded-md border border-foreground px-3 py-2 text-sm">
          <p className="font-semibold">Suggests: Full-stack developer with applied AI</p>
          <p className="text-muted-foreground">Already your direction.</p>
        </li>
      </ol>
      <div className="flex gap-2 border-t border-border p-3">
        <span className="h-9 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">Message the Guide</span>
        <Button type="button" size="sm" className="h-9">Send</Button>
      </div>
    </section>
  );
}

export function WorkbenchApp({ profile, states, pane }: { profile: ProfileView; states: ChapterState[]; pane: WorkbenchPane }) {
  const role = profile.roles.find((item) => item.roleId === profile.direction)!;
  const targets = Object.fromEntries(role.areas.map((area) => [area.area, area.target])) as Partial<Record<string, Level>>;
  const weeks = profile.roadmap.at(-1)?.doneByWeek ?? 0;
  const baselineOn = profile.baseline.completedAt ? new Date(profile.baseline.completedAt).toLocaleDateString("en", { month: "short", day: "numeric" }) : "Not taken";
  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b border-border pb-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Direction</p>
          <h1 className="font-display text-2xl font-semibold tracking-[-0.03em]">{role.title}</h1>
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-2">
          <Stat label="Your level for it" value={levelWords(role.overall)} />
          <Stat label="Still to do" value={`${role.missing.length} chapters, about ${weeks} weeks`} />
          <Stat label="Baseline" value={baselineOn} />
        </dl>
        <div className="flex gap-2">
          <Button size="sm" variant="outline">Take a checkpoint</Button>
        </div>
      </header>

      <div className="mt-4 grid gap-4 lg:h-[calc(100vh-300px)] lg:min-h-[520px] lg:grid-cols-[320px_minmax(0,1fr)]">
        <GuidePane />
        <section aria-label="Profile detail" className="flex min-h-0 flex-col rounded-xl bg-card shadow-panel">
          <nav aria-label="Profile sections" className="overflow-x-auto border-b border-border px-2">
            <ul className="flex min-w-max">
              {panes.map((item) => (
                <li key={item.id}>
                  <Link href={`/design-preview?view=profile-explore&d=workbench-app&pane=${item.id}`} aria-current={item.id === pane ? "page" : undefined}
                    className={cn("inline-block border-b-2 px-3 py-2.5 text-sm font-semibold", item.id === pane ? "border-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {pane === "shape" && (
              <div className="grid max-w-[720px] gap-8">
                <Skyline areas={profile.areas} targets={targets} compact />
                <div>
                  <h2 className="text-sm font-semibold">Still needed for {role.title}</h2>
                  <ul className="mt-2 grid divide-y divide-border border-y border-border text-sm sm:grid-cols-2 sm:gap-x-8 sm:divide-y-0">
                    {role.missing.map((item) => (
                      <li key={item.chapter} className="flex justify-between gap-3 py-2 sm:border-b sm:border-border">
                        <span className="min-w-0 truncate">{chapterTitle(item.chapter, profile)}</span>
                        <span className="shrink-0 text-muted-foreground">{depthWords[item.need].toLowerCase()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            {pane === "levels" && <LevelTable profile={profile} states={states} targets={targets} />}
            {pane === "roles" && <RoleChoices profile={profile} />}
            {pane === "radar" && <Radar profile={profile} />}
            {pane === "history" && <Assessed profile={profile} />}
            {pane === "definitions" && <Definitions profile={profile} />}
          </div>
        </section>
      </div>
    </div>
  );
}

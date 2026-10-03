import Link from "next/link";
import { Check, ExternalLink } from "lucide-react";
import { depthAtLeast, LEVELS, levelRank, type ChapterState, type Level } from "@ken-os/domain";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { careers, topicMap } from "@/features/engineering-lab/curriculum";
import type { ProfileView } from "@/features/engineering-lab/profile-store";
import { cn } from "@/lib/utils";
import { Skyline } from "../profile/skyline";
import { depthWords, levelWords, radarTagWords } from "../words";
import { WorkbenchApp, type WorkbenchPane } from "./workbench-app";

// Design exploration for the profile page, development preview only. Three directions over the same sample
// learner. Buttons are inert here; the conversation is a sample transcript.

export type ProfileDirection = "workbench" | "workbench-app" | "tabs" | "compare";
export type ProfileTab = "direction" | "levels" | "radar" | "assessed" | "definitions";

const directions: { id: ProfileDirection; name: string; idea: string }[] = [
  { id: "workbench", name: "Workbench", idea: "The Guide stays on the left the whole time; your shape, the level table and the roles scroll on the right, so you talk while looking at the numbers." },
  { id: "workbench-app", name: "Workbench, app style", idea: "The same Workbench as a tool, not a page: a compact title bar, two panes that scroll on their own, and section tabs instead of one long scroll." },
  { id: "tabs", name: "Tabs", idea: "One focused view at a time: direction, levels, radar, assessments, definitions. Shortest page, most clicks." },
  { id: "compare", name: "Compare roles", idea: "Leads with a grid of roles against areas: what each role needs and where you are, so the choice is made by comparing." },
];

export const sampleTalk = [
  { role: "guide" as const, text: "Here's your shape from the baseline. Tell me what you want to build over the next year, and I'll walk you through which roles fit." },
  { role: "owner" as const, text: "My own products, with AI features that hold up. I don't want to train models." },
  { role: "guide" as const, text: "Then full-stack with applied AI fits: it needs mid-level in all five areas. You're closest in Frontend. Production and Applied AI are the long poles, and they share four chapters with AI product engineer if you go further later." },
];

function chapterTitle(id: string) {
  return topicMap.modules.find((module) => module.id === id)?.title ?? id;
}

function useRole(profile: ProfileView) {
  const role = profile.roles.find((item) => item.roleId === profile.direction)!;
  const targets = Object.fromEntries(role.areas.map((area) => [area.area, area.target])) as Partial<Record<string, Level>>;
  return { role, targets };
}

function Switcher({ active, tab }: { active: ProfileDirection; tab: ProfileTab }) {
  return (
    <nav aria-label="Design directions" className="mb-8 rounded-lg bg-muted px-4 py-3">
      <p className="text-sm text-muted-foreground">Profile page exploration, sample data. Buttons do nothing here.</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {directions.map((item) => (
          <li key={item.id}>
            <Link href={`/design-preview?view=profile-explore&d=${item.id}${item.id === "tabs" ? `&tab=${tab}` : ""}`} aria-current={item.id === active ? "page" : undefined}
              className={cn("inline-flex h-8 items-center rounded-md border px-3 text-sm font-semibold", item.id === active ? "border-foreground bg-background" : "border-border text-muted-foreground hover:text-foreground")}>
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm">{directions.find((item) => item.id === active)!.idea}</p>
    </nav>
  );
}

// ---- Shared sections, worded the same in every direction ----

function Talk({ tall }: { tall?: boolean }) {
  return (
    <section aria-labelledby="talk-title" className="rounded-xl border border-border p-5">
      <h2 className="font-display text-lg font-semibold" id="talk-title">Talk it through</h2>
      <p className="mt-1 text-sm text-muted-foreground">The Guide only uses your real numbers. It suggests; you confirm.</p>
      <ol className={cn("mt-4 space-y-3 overflow-y-auto", tall ? "max-h-[520px]" : "max-h-[340px]")}>
        {sampleTalk.map((message, index) => (
          <li key={index} className={cn("max-w-[92%] rounded-lg px-4 py-3 text-sm leading-6", message.role === "owner" ? "ml-auto border border-border" : "bg-muted")}>
            <span className="sr-only">{message.role === "owner" ? "You: " : "Guide: "}</span>{message.text}
          </li>
        ))}
      </ol>
      <div className="mt-4 rounded-lg border border-foreground p-4">
        <p className="text-sm font-semibold">Suggested: Full-stack developer with applied AI</p>
        <p className="mt-1 text-sm text-muted-foreground">Already your direction.</p>
      </div>
      <div className="mt-4 flex gap-2">
        <span className="h-10 flex-1 rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-muted-foreground">Write as you would say it.</span>
        <Button type="button">Send</Button>
      </div>
    </section>
  );
}

/** Report's table: every level's chapters per area, ticked when deep enough, the target outlined. */
export function LevelTable({ profile, states, targets }: { profile: ProfileView; states: ChapterState[]; targets: Partial<Record<string, Level>> }) {
  const state = (chapter: string) => states.find((item) => item.chapterId === chapter);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] border-collapse text-left text-sm">
        <caption className="mb-2 text-left text-sm text-muted-foreground">A tick means that chapter is deep enough. Your direction&apos;s target is outlined.</caption>
        <thead>
          <tr className="border-b border-foreground">
            <th scope="col" className="w-[160px] py-2 pr-4 font-semibold">Area</th>
            {LEVELS.map((level) => <th key={level} scope="col" className="py-2 pr-4 font-semibold">{levelWords(level)}</th>)}
          </tr>
        </thead>
        <tbody>
          {careers.areas.map((ladder) => {
            const area = profile.areas.find((item) => item.area === ladder.id)!;
            return (
              <tr key={ladder.id} className="border-b border-border align-top">
                <th scope="row" className="py-3 pr-4 font-normal">
                  <span className="block font-semibold">{ladder.title}</span>
                  <span className="text-muted-foreground">{levelWords(area.now.level)}{area.now.estimate ? ", estimate" : ""}</span>
                </th>
                {LEVELS.map((level) => (
                  <td key={level} className="py-2 pr-2">
                    <div className={cn("rounded-md p-2", levelRank(area.now.level) >= levelRank(level) && "bg-status-solid-surface", targets[ladder.id] === level && "outline-2 outline-foreground")}>
                      <ul className="space-y-1">
                        {ladder.levels[level].map((requirement) => {
                          const met = depthAtLeast(state(requirement.chapter)?.depth ?? "none", requirement.depth);
                          return (
                            <li key={requirement.chapter} className="flex items-start gap-1.5">
                              {met ? <Check size={14} className="mt-0.5 shrink-0 text-status-solid" aria-label="Done" /> : <span className="mt-1.5 size-2 shrink-0 rounded-full border border-muted-foreground" aria-label="Not yet" />}
                              <span>{chapterTitle(requirement.chapter)} <span className="text-muted-foreground">({depthWords[requirement.depth].toLowerCase()})</span></span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function RoleChoices({ profile }: { profile: ProfileView }) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {[...profile.roles].sort((a, b) => a.missing.length - b.missing.length).map((role) => (
        <li key={role.roleId} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">{role.title}</p>
            <p className="text-sm text-muted-foreground">{role.missing.length} chapters away, {levelWords(role.overall).toLowerCase()} now</p>
          </div>
          {role.roleId === profile.direction ? <Pill tone="solid">Your direction</Pill> : <Button size="sm" variant="outline">Choose</Button>}
        </li>
      ))}
    </ul>
  );
}

export function Radar({ profile }: { profile: ProfileView }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" disabled>Scanned this week ({profile.radar.week})</Button>
        <p className="text-sm text-muted-foreground">Once a week, at most five items, official sources only.</p>
      </div>
      <ul className="mt-4 divide-y divide-border border-y border-border">
        {profile.radar.items.map((item) => (
          <li key={item.id} className="py-3">
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold"><Pill tone="neutral">{radarTagWords[item.tag]}</Pill>{item.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{item.reason}</p>
            {item.sourceUrl && <a href={item.sourceUrl} className="inline-flex items-center gap-1 text-sm underline underline-offset-4">Source<ExternalLink size={12} aria-hidden="true" /></a>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Assessed({ profile }: { profile: ProfileView }) {
  return (
    <div className="text-sm">
      <ul className="divide-y divide-border border-y border-border">
        <li className="flex justify-between gap-3 py-3"><span className="font-semibold underline underline-offset-4">Baseline</span><span className="text-muted-foreground">finished {profile.baseline.completedAt ? new Date(profile.baseline.completedAt).toLocaleDateString("en", { month: "long", day: "numeric" }) : ""}</span></li>
      </ul>
      <p className="mt-3 text-muted-foreground">Every question, answer and grade is saved, with the prompt versions and model.</p>
      <Button variant="outline" className="mt-3">Take a checkpoint</Button>
    </div>
  );
}

export function Definitions({ profile }: { profile: ProfileView }) {
  return (
    <div className="grid gap-6 text-sm leading-6 md:grid-cols-2">
      <div>
        <p className="font-semibold">Developer</p><p>{profile.careers.definitions.developer}</p>
        <p className="mt-4 font-semibold">Engineer</p><p>{profile.careers.definitions.engineer}</p>
      </div>
      <ul className="space-y-3">
        {profile.careers.levels.map((level) => <li key={level.id}><p className="font-semibold">{level.title}</p><p>{level.summary}</p></li>)}
      </ul>
      <p className="text-muted-foreground md:col-span-2">Draft, not approved yet. {profile.careers.note}</p>
    </div>
  );
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return <h2 className="font-display text-xl font-semibold" id={id}>{children}</h2>;
}

// ---- Direction 1: Workbench ----

function Workbench({ profile, states }: { profile: ProfileView; states: ChapterState[] }) {
  const { role, targets } = useRole(profile);
  return (
    <>
      <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-[-0.06em] sm:text-5xl">{role.title}</h1>
      <p className="mt-3 max-w-[640px] text-[17px] leading-7 text-muted-foreground">A direction, not a lock. Change it whenever your goals change; your baseline stays put and the road redraws.</p>
      <div className="mt-8 grid gap-10 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-6 lg:self-start"><Talk tall /></div>
        <div className="min-w-0 space-y-12">
          <section aria-labelledby="wb-shape"><H2 id="wb-shape">Your shape</H2><div className="mt-4"><Skyline areas={profile.areas} targets={targets} /></div></section>
          <section aria-labelledby="wb-levels"><H2 id="wb-levels">What each level needs</H2><div className="mt-3"><LevelTable profile={profile} states={states} targets={targets} /></div></section>
          <section aria-labelledby="wb-roles"><H2 id="wb-roles">Or choose yourself</H2><div className="mt-3"><RoleChoices profile={profile} /></div></section>
          <section aria-labelledby="wb-radar"><H2 id="wb-radar">Your radar</H2><div className="mt-3"><Radar profile={profile} /></div></section>
          <section aria-labelledby="wb-assessed"><H2 id="wb-assessed">How this was assessed</H2><div className="mt-3"><Assessed profile={profile} /></div></section>
          <section aria-labelledby="wb-def"><H2 id="wb-def">What the levels mean</H2><div className="mt-3"><Definitions profile={profile} /></div></section>
        </div>
      </div>
    </>
  );
}

// ---- Direction 2: Tabs ----

const tabs: { id: ProfileTab; name: string }[] = [
  { id: "direction", name: "Direction" },
  { id: "levels", name: "Levels" },
  { id: "radar", name: "Radar" },
  { id: "assessed", name: "Assessments" },
  { id: "definitions", name: "Definitions" },
];

function Tabs({ profile, states, tab }: { profile: ProfileView; states: ChapterState[]; tab: ProfileTab }) {
  const { role, targets } = useRole(profile);
  return (
    <>
      <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-[-0.06em] sm:text-5xl">{role.title}</h1>
      <p className="mt-3 text-[17px] leading-7 text-muted-foreground">You&apos;re {levelWords(role.overall).toLowerCase()} for it, {role.missing.length} chapters away.</p>
      <nav aria-label="Profile sections" className="mt-8 border-b border-border">
        <ul className="-mb-px flex flex-wrap gap-6">
          {tabs.map((item) => (
            <li key={item.id}>
              <Link href={`/design-preview?view=profile-explore&d=tabs&tab=${item.id}`} aria-current={item.id === tab ? "page" : undefined}
                className={cn("inline-block border-b-2 pb-3 text-sm font-semibold", item.id === tab ? "border-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-8">
        {tab === "direction" && <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"><Talk /><RoleChoices profile={profile} /></div>}
        {tab === "levels" && <div className="space-y-10"><Skyline areas={profile.areas} targets={targets} /><LevelTable profile={profile} states={states} targets={targets} /></div>}
        {tab === "radar" && <Radar profile={profile} />}
        {tab === "assessed" && <Assessed profile={profile} />}
        {tab === "definitions" && <Definitions profile={profile} />}
      </div>
    </>
  );
}

// ---- Direction 3: Compare roles ----

function Compare({ profile, states }: { profile: ProfileView; states: ChapterState[] }) {
  const { targets } = useRole(profile);
  const roles = [...profile.roles].sort((a, b) => a.missing.length - b.missing.length);
  return (
    <>
      <h1 className="max-w-[760px] font-display text-4xl font-bold leading-[1.08] tracking-[-0.06em] sm:text-5xl">Which engineer do you want to be?</h1>
      <p className="mt-3 max-w-[640px] text-[17px] leading-7 text-muted-foreground">Each column is a role. Each row is an area: what the role needs, against where you are now.</p>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-left text-sm">
          <caption className="sr-only">Roles compared by the level each needs per area, and your level now</caption>
          <thead>
            <tr className="align-bottom">
              <th scope="col" className="w-[150px] pb-3 pr-3 font-semibold">You now</th>
              {roles.map((role) => (
                <th key={role.roleId} scope="col" className={cn("px-3 pb-3 font-semibold", role.roleId === profile.direction && "rounded-t-lg bg-muted")}>
                  <span className="block font-display text-[15px] leading-5">{role.title}</span>
                  <span className="mt-1 block font-normal text-muted-foreground">{role.missing.length} chapters away</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {careers.areas.map((ladder) => {
              const area = profile.areas.find((item) => item.area === ladder.id)!;
              return (
                <tr key={ladder.id} className="border-t border-border">
                  <th scope="row" className="py-3 pr-3 font-normal">
                    <span className="block font-semibold">{ladder.title}</span>
                    <span className="text-muted-foreground">{levelWords(area.now.level)}{area.now.estimate ? ", estimate" : ""}</span>
                  </th>
                  {roles.map((role) => {
                    const target = careers.roles.find((item) => item.id === role.roleId)!.targets[ladder.id];
                    const short = target ? Math.max(0, levelRank(target) - levelRank(area.now.level)) : 0;
                    return (
                      <td key={role.roleId} className={cn("px-3 py-3", role.roleId === profile.direction && "bg-muted")}>
                        {target ? (
                          <span className="flex items-center gap-2">
                            <span className="flex gap-0.5" aria-hidden="true">
                              {LEVELS.map((level, index) => (
                                <span key={level} className={cn("h-3 w-4 rounded-[2px]", index <= levelRank(target) ? (index <= levelRank(area.now.level) ? "bg-foreground" : "border border-foreground") : "bg-transparent")} />
                              ))}
                            </span>
                            <span>{levelWords(target)}{short ? <span className="text-muted-foreground">, {short} up</span> : <span className="text-status-solid">, there</span>}</span>
                          </span>
                        ) : <span className="text-muted-foreground">Not needed</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            <tr className="border-t border-border">
              <td />
              {roles.map((role) => (
                <td key={role.roleId} className={cn("px-3 py-3", role.roleId === profile.direction && "rounded-b-lg bg-muted")}>
                  {role.roleId === profile.direction ? <Pill tone="solid">Your direction</Pill> : <Button size="sm" variant="outline">Choose</Button>}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">Filled squares are levels you have; outlined ones are what the role still needs.</p>

      <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Talk />
        <section aria-labelledby="cmp-levels"><H2 id="cmp-levels">Your direction in detail</H2><div className="mt-3"><LevelTable profile={profile} states={states} targets={targets} /></div></section>
      </div>
      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="cmp-radar"><H2 id="cmp-radar">Your radar</H2><div className="mt-3"><Radar profile={profile} /></div></section>
        <section aria-labelledby="cmp-assessed"><H2 id="cmp-assessed">How this was assessed</H2><div className="mt-3"><Assessed profile={profile} /></div></section>
      </div>
      <section className="mt-12" aria-labelledby="cmp-def"><H2 id="cmp-def">What the levels mean</H2><div className="mt-3"><Definitions profile={profile} /></div></section>
    </>
  );
}

export function ProfileExplore({ profile, states, direction, tab, pane = "shape" }: { profile: ProfileView; states: ChapterState[]; direction: ProfileDirection; tab: ProfileTab; pane?: WorkbenchPane }) {
  return (
    <WorkspaceShell email="preview@example.invalid" active="lab" preview>
      <div className="mx-auto min-h-[calc(100vh-88px)] w-full max-w-[1180px] border-x border-border px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <Switcher active={direction} tab={tab} />
        {direction === "workbench" && <Workbench profile={profile} states={states} />}
        {direction === "workbench-app" && <WorkbenchApp profile={profile} states={states} pane={pane} />}
        {direction === "tabs" && <Tabs profile={profile} states={states} tab={tab} />}
        {direction === "compare" && <Compare profile={profile} states={states} />}
      </div>
    </WorkspaceShell>
  );
}

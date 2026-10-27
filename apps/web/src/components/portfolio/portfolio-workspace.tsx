"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  IconChevronDown,
  IconChevronRight,
  IconCircleCheck,
  IconCircleDashed,
  IconExternalLink,
  IconFlask,
  IconHistory,
  IconLock,
  IconWorld,
} from "@tabler/icons-react";
import { AlertCircle } from "lucide-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { ConfirmDialog } from "@/components/profile/confirm-dialog";
import { shortDate } from "@/components/profile/dates";
import { StatusIcon } from "@/components/engineering/roadmap/status";
import { panel } from "@/components/surfaces";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import type { PortfolioState } from "@/features/portfolio/store";
import { post, send } from "@/lib/api-client";
import { cn } from "@/lib/utils";

// Portfolio: what the public site shows, and one Publish for all of it. Spec: docs/architecture/portfolio.md; frames
// A and B of docs/mockups/portfolio.md, drawn on the Portfolio mockups canvas in the Profile Ledger look.

const templateWords: Record<string, string> = { classic: "Classic", compact: "Compact", technical: "Technical" };
const paperWords: Record<string, string> = { letter: "Letter", a4: "A4" };

type Tone = "public" | "changed" | "private" | "off";

/** A row's state word. The word and its icon carry the state; the colour only repeats it. */
function StateBadge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <Badge
      variant={tone === "changed" ? "default" : "outline"}
      className={cn(
        tone === "changed" && "bg-selected/12 text-selected",
        (tone === "private" || tone === "off") && "text-muted-foreground",
      )}
    >
      {tone === "changed" && <IconHistory aria-hidden="true" />}
      {tone === "private" && <IconLock aria-hidden="true" />}
      {children}
    </Badge>
  );
}

const rowGrid =
  "grid min-h-11 grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-3 px-3.5 py-2 md:grid-cols-[18px_150px_minmax(0,1fr)_auto]";

/** One ledger row: icon, name, what it holds, and its state or switch at the end. */
function Row({
  icon,
  name,
  summary,
  end,
  href,
}: {
  icon: ReactNode;
  name: ReactNode;
  /** What the row holds. Without one, the name takes its column too. */
  summary?: ReactNode;
  end?: ReactNode;
  href?: string;
}) {
  const body = (
    <>
      {icon}
      <span className={cn("min-w-0 font-semibold md:truncate", summary === undefined && "md:col-span-2")}>{name}</span>
      {summary !== undefined && <span className="hidden truncate text-muted-foreground md:block">{summary}</span>}
      <span className="flex items-center gap-2.5 justify-self-end">
        {end}
        {href && <IconChevronRight size={14} aria-hidden="true" className="text-muted-foreground" />}
      </span>
    </>
  );
  return (
    <li>
      {href ? (
        <Link href={href} className={cn(rowGrid, "hover:bg-muted/50")}>
          {body}
        </Link>
      ) : (
        <div className={rowGrid}>{body}</div>
      )}
    </li>
  );
}

const learnedIcon = <IconCircleCheck size={18} aria-hidden="true" className="text-topic-learned" />;
const privateIcon = <IconLock size={18} aria-hidden="true" className="text-muted-foreground" />;

function SectionTitle({ id, title, note }: { id: string; title: string; note: string }) {
  return (
    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-0.5">
      <h2 id={id} className="font-heading text-base font-bold">
        {title}
      </h2>
      <span className="text-[13px] text-muted-foreground">{note}</span>
    </div>
  );
}

export function PortfolioWorkspace({ email, portfolio }: { email: string; portfolio: PortfolioState }) {
  const [state, setState] = useState(portfolio);
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const { live, latest, profileSavedAt, unpublishedChanges, engineering } = state;
  const shownExplanations = engineering.learned.filter((topic) => topic.shown).length;
  const anyShown = engineering.roadmaps.some((roadmap) => roadmap.shown);

  async function run(action: "publish" | "unpublish") {
    setBusy(action);
    setProblem(null);
    try {
      setState(await post<PortfolioState>(`/api/portfolio/${action}`));
      setConfirmUnpublish(false);
      toast({ tone: "success", title: action === "publish" ? "Portfolio published" : "Portfolio unpublished" });
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Couldn't publish. Try again");
    } finally {
      setBusy(null);
    }
  }

  /** Saves one switch at once; like everything else here, it reaches the site on the next Publish. */
  async function toggle(key: string, body: Record<string, unknown>) {
    setBusy(key);
    setProblem(null);
    try {
      setState(await send<PortfolioState>("/api/portfolio/settings", "PUT", body));
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Couldn't save. Try again");
    } finally {
      setBusy(null);
    }
  }

  const badge = live
    ? unpublishedChanges
      ? { tone: "changed" as const, word: "Changes not published" }
      : { tone: "public" as const, word: "Live" }
    : { tone: "off" as const, word: "Not published" };
  const resume = state.resume ?? { template: "classic", paper: "letter" };

  return (
    <WorkspaceShell email={email} active="portfolio">
      {/* Fills the screen below the 3rem header so the footer sits at the bottom, not under short content. */}
      <div className="flex min-h-[calc(100svh-3rem)] flex-col">
        <div className="mx-auto w-full max-w-5xl px-page pt-page pb-section text-sm">
          <div className="flex flex-col gap-block">
            <div className="block items-end justify-between gap-6 md:flex">
              <div className="min-w-0">
                <h1 className="font-heading text-2xl leading-tight font-semibold tracking-tight">Portfolio</h1>
                {state.contact?.name && <p className="mt-2 text-muted-foreground">{state.contact.name}</p>}
              </div>
              <dl className="mt-3.5 grid shrink-0 grid-cols-[auto_auto] justify-start gap-x-3.5 gap-y-1 text-[13px] md:mt-0">
                <dt className="text-muted-foreground">Published</dt>
                <dd>{latest ? shortDate(latest.publishedAt) : "Never"}</dd>
                <dt className="text-muted-foreground">Profile saved</dt>
                <dd>{profileSavedAt ? shortDate(profileSavedAt) : "Not saved"}</dd>
                <dt className="text-muted-foreground">Site</dt>
                <dd>Not set up</dd>
              </dl>
            </div>

            {problem && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertTitle>{problem}</AlertTitle>
              </Alert>
            )}
            {!profileSavedAt && (
              <Alert>
                <AlertCircle />
                <AlertTitle className="flex items-center gap-3">
                  No details saved
                  <Link href="/profile" className="ml-auto font-medium underline underline-offset-4">
                    Open Profile
                  </Link>
                </AlertTitle>
              </Alert>
            )}

            <section
              aria-label="Site"
              className={cn(panel, "flex flex-wrap items-center gap-3 px-3.5 py-3 md:flex-nowrap")}
            >
              <IconWorld size={18} aria-hidden="true" className="shrink-0" />
              <div className="flex min-w-0 flex-1 basis-[calc(100%-2.5rem)] flex-col gap-0.5 md:basis-auto">
                <div className="flex items-center gap-2 font-semibold">
                  Site
                  <StateBadge tone={badge.tone}>
                    {badge.tone === "public" && <IconCircleCheck aria-hidden="true" />}
                    {badge.word}
                  </StateBadge>
                </div>
                <p className="truncate text-muted-foreground">
                  {live
                    ? `Version ${live.version}, ${shortDate(live.publishedAt)}`
                    : latest
                      ? `Unpublished, last version ${latest.version}`
                      : "Not published"}
                </p>
              </div>
              {live && (
                <>
                  <Button asChild variant="outline" size="sm" className="text-[13px] max-md:flex-1">
                    <a href="/api/public/portfolio/resume" target="_blank" rel="noopener noreferrer">
                      Open resume
                      <IconExternalLink data-icon="inline-end" aria-hidden="true" />
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="text-[13px] max-md:flex-1">
                    <a href="/api/public/portfolio" target="_blank" rel="noopener noreferrer">
                      Open snapshot
                      <IconExternalLink data-icon="inline-end" aria-hidden="true" />
                    </a>
                  </Button>
                </>
              )}
            </section>

            <section aria-labelledby="public-title">
              <SectionTitle id="public-title" title="What goes public" note="Changes go live on the next Publish" />
              <ul className={cn(panel, "divide-y")}>
                <Row
                  icon={profileSavedAt ? learnedIcon : <IconCircleDashed size={18} aria-hidden="true" />}
                  name="Profile"
                  summary="Name, headline, location, summary, links, experience, education, skills, projects"
                  href="/profile"
                  end={
                    !profileSavedAt ? (
                      <StateBadge tone="off">Not saved</StateBadge>
                    ) : live && state.profileChanged ? (
                      <StateBadge tone="changed">Changed</StateBadge>
                    ) : live ? (
                      <StateBadge tone="public">Public</StateBadge>
                    ) : (
                      <StateBadge tone="off">Not published</StateBadge>
                    )
                  }
                />
                <Row
                  icon={learnedIcon}
                  name="Resume PDF"
                  summary={`${templateWords[resume.template] ?? resume.template}, ${paperWords[resume.paper] ?? resume.paper}, from Resume`}
                  href="/profile#resumes"
                  end={<StateBadge tone={live ? "public" : "off"}>{live ? "Public" : "Not published"}</StateBadge>}
                />
                <Row
                  icon={privateIcon}
                  name={
                    <Label htmlFor="show-email" className="text-sm font-semibold">
                      Email
                    </Label>
                  }
                  summary={<span className="font-mono text-xs">{state.contact?.email || "No email saved"}</span>}
                  end={
                    <>
                      <StateBadge tone={state.showEmail ? "public" : "private"}>
                        {state.showEmail ? "Shown" : "Private"}
                      </StateBadge>
                      <Switch
                        id="show-email"
                        aria-label="Show email"
                        checked={state.showEmail}
                        onCheckedChange={(checked) => void toggle("email", { showEmail: checked })}
                        disabled={busy !== null}
                      />
                    </>
                  }
                />
                <Row
                  icon={privateIcon}
                  name="Never published"
                  summary="Phone, local fields, education notes"
                  end={<StateBadge tone="private">Private</StateBadge>}
                />
              </ul>
            </section>

            <section aria-labelledby="engineering-title">
              <SectionTitle id="engineering-title" title="Engineering" note="Chapters, statuses and Claude's reviews" />
              <ul className={cn(panel, "divide-y")}>
                {engineering.roadmaps.length === 0 && (
                  <Row
                    icon={<IconFlask size={18} aria-hidden="true" className="text-muted-foreground" />}
                    name="No roadmap yet"
                    end={
                      <Button asChild variant="outline" size="sm" className="text-[13px]">
                        <Link href="/engineering">Open Engineering</Link>
                      </Button>
                    }
                  />
                )}
                {engineering.roadmaps.map((roadmap) => (
                  <Row
                    key={roadmap.id}
                    icon={
                      <IconFlask
                        size={18}
                        aria-hidden="true"
                        className={roadmap.shown ? undefined : "text-muted-foreground"}
                      />
                    }
                    name={
                      <Label htmlFor={`roadmap-${roadmap.id}`} className="inline text-sm leading-snug font-semibold">
                        {roadmap.goal}
                      </Label>
                    }
                    end={
                      <>
                        <span className="font-mono text-xs text-muted-foreground">
                          {roadmap.learned} of {roadmap.total}
                        </span>
                        <span className="max-md:hidden">
                          <StateBadge tone={roadmap.shown ? "public" : "off"}>
                            {roadmap.shown ? "Shown" : "Hidden"}
                          </StateBadge>
                        </span>
                        <Switch
                          id={`roadmap-${roadmap.id}`}
                          aria-label="Show on site"
                          checked={roadmap.shown}
                          onCheckedChange={(checked) =>
                            void toggle(`roadmap-${roadmap.id}`, { roadmapId: roadmap.id, shown: checked })
                          }
                          disabled={busy !== null}
                        />
                      </>
                    }
                  />
                ))}
                {anyShown && engineering.learned.length === 0 && (
                  <li className="px-3.5 py-3 text-muted-foreground">No learned topics yet</li>
                )}
                {engineering.learned.length > 0 && (
                  <li>
                    <Collapsible>
                      <CollapsibleTrigger className={cn(rowGrid, "group w-full text-left hover:bg-muted/50")}>
                        <IconChevronDown
                          size={16}
                          aria-hidden="true"
                          className="text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90"
                        />
                        <span className="font-semibold md:col-span-2">My explanations</span>
                        <span className="justify-self-end font-mono text-xs text-muted-foreground">
                          {shownExplanations} of {engineering.learned.length} shown
                        </span>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <ul className="px-3.5 pb-3 md:pl-12">
                          {engineering.learned.map((topic) => (
                            <li
                              key={topic.topicId}
                              className="grid grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-t py-2.5"
                            >
                              <StatusIcon status="learned" />
                              <div className="min-w-0">
                                <Label
                                  htmlFor={`explain-${topic.topicId}`}
                                  className="inline text-sm leading-snug font-medium"
                                >
                                  {topic.title}
                                </Label>{" "}
                                <span className="text-[12.5px] text-muted-foreground">
                                  {topic.explanation
                                    ? topic.learnedAt
                                      ? `Learned ${shortDate(topic.learnedAt)}`
                                      : "Learned"
                                    : "No explanation saved"}
                                </span>
                                {topic.explanation && !topic.shown && (
                                  <p className="truncate text-[12.5px] text-muted-foreground">{topic.explanation}</p>
                                )}
                              </div>
                              <span className="flex items-center gap-2.5">
                                {topic.shown && <StateBadge tone="changed">Shown</StateBadge>}
                                <Switch
                                  id={`explain-${topic.topicId}`}
                                  aria-label="Show explanation"
                                  checked={topic.shown}
                                  onCheckedChange={(checked) =>
                                    void toggle(`explain-${topic.topicId}`, { topicId: topic.topicId, shown: checked })
                                  }
                                  disabled={busy !== null || !topic.explanation}
                                />
                              </span>
                              {topic.shown && topic.explanation && (
                                <blockquote className="col-span-full rounded-md border bg-background px-3 py-2.5 text-[13.5px] whitespace-pre-line md:col-start-2">
                                  {topic.explanation}
                                </blockquote>
                              )}
                            </li>
                          ))}
                        </ul>
                      </CollapsibleContent>
                    </Collapsible>
                  </li>
                )}
              </ul>
              <p className="mt-2 px-0.5 text-[13px] text-muted-foreground">
                Never published: notes, exercises, sessions
              </p>
            </section>
          </div>
        </div>

        <div className="sticky bottom-0 z-10 mt-auto border-t bg-card">
          <div className="flex items-center justify-end gap-2 px-3 py-3 md:px-5">
            <span className="mr-auto text-sm text-muted-foreground">
              {live
                ? unpublishedChanges
                  ? "Changes not published"
                  : `Published ${shortDate(live.publishedAt)}`
                : "Not published"}
            </span>
            {live && (
              <Button type="button" variant="ghost" onClick={() => setConfirmUnpublish(true)} disabled={busy !== null}>
                Unpublish
              </Button>
            )}
            <Button type="button" onClick={() => void run("publish")} disabled={busy !== null || !profileSavedAt}>
              {busy === "publish" ? "Publishing…" : "Publish"}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmUnpublish}
        title="Unpublish portfolio?"
        description="The site shows a holding page"
        action="Unpublish"
        busy={busy === "unpublish"}
        onOpenChange={setConfirmUnpublish}
        onConfirm={() => void run("unpublish")}
      />
    </WorkspaceShell>
  );
}

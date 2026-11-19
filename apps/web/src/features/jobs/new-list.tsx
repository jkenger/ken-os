"use client";

import { ArrowUpRight, Bookmark, Check, FileText, LoaderCircle, Mail } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DotSeparator } from "@/components/dot-separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/toaster";
import { CompanyAvatar } from "@/features/jobs/company-avatar";
import { countryFlag, countryName } from "@/features/jobs/country-flags";
import { atsScore, matchSkills } from "@/features/jobs/skills-match";
import type { PostingView } from "@/features/jobs/store";
import { timeAgo } from "@/features/jobs/time-ago";
import { send } from "@/lib/api-client";
import { CoverLetterTab } from "./cover-letter-tab";
import { ScoreRing } from "./score-ring";
import { SkillBadge } from "./skill-badge";
import { TailoredCvActions } from "./tailored-cv-actions";
import { useApplyFlow } from "./use-apply-flow";
import { useCoverLetterFlow } from "./use-cover-letter-flow";
import { useTailorFlow } from "./use-tailor-flow";

// New postings as cards (docs/mockups/Jobs redesign.html, "Desktop / New (cards)"): company, title, score, a meta
// row (work setup, countries, job type, seniority, posted), the posting's own snippet truncated to two lines,
// skill badges, and Save. Clicking anywhere on the card except Save opens its own page at /jobs/[id].

const WORK_SETUP_LABELS: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  on_site: "On-site",
};

const JOB_TYPE_LABELS: Record<string, string> = {
  full_time: "Full time",
  part_time: "Part time",
  contract: "Contract",
  internship: "Internship",
  temporary: "Temporary",
};

const SENIORITY_LABELS: Record<string, string> = {
  junior: "Junior",
  mid: "Mid",
  senior: "Senior",
  lead: "Lead",
};

const MAX_SKILLS = 5;

function countryMeta(countries: string[]): string | null {
  if (countries.length === 0) return null;
  const [first, ...rest] = countries;
  return rest.length > 0
    ? `${countryFlag(first!)} ${countryName(first!)} +${rest.length}`
    : `${countryFlag(first!)} ${countryName(first!)}`;
}

function initials(company: string): string {
  const words = company.trim().split(/\s+/).filter(Boolean);
  return (words[0]?.[0] ?? "?").toUpperCase() + (words[1]?.[0] ?? "").toUpperCase();
}

/** The source's own stated range when it gave two different numbers ("$2,000-$3,000" says more than the
 *  midpoint `payAmount` averages it into); a single amount otherwise. */
export function payRangeLabel(
  posting: Pick<PostingView, "payAmount" | "payCurrency" | "payPeriod" | "sourceSalaryMin" | "sourceSalaryMax">,
): string | null {
  if (!posting.payCurrency || !posting.payPeriod) return null;
  const { sourceSalaryMin: min, sourceSalaryMax: max } = posting;
  if (min != null && max != null && min !== max) {
    return `${posting.payCurrency} ${Math.round(min).toLocaleString()}–${Math.round(max).toLocaleString()} a ${posting.payPeriod}`;
  }
  if (posting.payAmount == null) return null;
  return `${posting.payCurrency} ${Math.round(posting.payAmount).toLocaleString()} a ${posting.payPeriod}`;
}

/** The Tailored CV modal's "Made <date>" row (docs/architecture/job-card-actions.md, "Two new modals"). */
function madeOnLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function SaveButton({
  postingId,
  title,
  saved,
  onSavedChange,
}: {
  postingId: string;
  title: string;
  saved: boolean;
  onSavedChange: (saved: boolean) => void;
}) {
  const [pending, setPending] = useState(false);
  async function toggle(next: boolean) {
    onSavedChange(next);
    setPending(true);
    try {
      await send(`/api/jobs/postings/${postingId}/save`, "POST", { saved: next });
    } catch (error) {
      onSavedChange(!next);
      toast({ tone: "error", title: error instanceof Error ? error.message : "Couldn't save. Try again" });
    } finally {
      setPending(false);
    }
  }
  return (
    <Button
      type="button"
      variant={saved ? "secondary" : "outline"}
      size="icon-sm"
      aria-pressed={saved}
      aria-label={saved ? `Unsave ${title}` : `Save ${title}`}
      disabled={pending}
      onClick={(event) => {
        event.preventDefault();
        void toggle(!saved);
      }}
      className="shrink-0"
    >
      <Bookmark className={saved ? "fill-current" : undefined} />
    </Button>
  );
}

/** Job Board's undo for Applied (plans/jobs-job-board.md, Slice 4) -- clears `appliedAt` only, leaving Saved as
 *  it was. Shown only on Job Board's own card variant, next to "Applied <when>". */
function MarkNotAppliedButton({ postingId, onDone }: { postingId: string; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  async function markNotApplied() {
    setPending(true);
    try {
      await send(`/api/jobs/postings/${postingId}/unapply`, "POST");
      onDone();
    } catch (error) {
      toast({ tone: "error", title: error instanceof Error ? error.message : "Couldn't update. Try again" });
    } finally {
      setPending(false);
    }
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={markNotApplied}
      className="h-6 px-2 text-xs text-muted-foreground"
    >
      Mark not applied
    </Button>
  );
}

/** Batch size the infinite scroll fetches at a time (`/api/jobs/postings`) -- stagger delay resets every this
 *  many cards, so a newly loaded batch animates in from its own top rather than picking up where the last one's
 *  delay left off. */
const PAGE_SIZE = 10;

/** Most postings never get opened -- there's always more on the board than anyone clicks one by one -- so a
 *  click-only New badge would keep showing for months. Past this many days since `firstSeenAt`, it quietly stops
 *  showing even if `viewedAt` is still null (docs/product/job-finder.md, "New vs Viewed"). */
const NEW_BADGE_MAX_AGE_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export function isNew(posting: Pick<PostingView, "viewedAt" | "firstSeenAt">): boolean {
  if (posting.viewedAt) return false;
  return Date.now() - posting.firstSeenAt.getTime() <= NEW_BADGE_MAX_AGE_DAYS * DAY_MS;
}

/** The card's badge slot: Applied wins over Saved (a posting applied to from Job Board stays marked Applied even
 *  if also saved, docs/mockups/jobs-redesign-canvas/JB.dc.html), Saved wins over New, New otherwise, or no badge
 *  at all (docs/architecture/job-board.md). */
export function postingBadge(
  posting: Pick<PostingView, "viewedAt" | "firstSeenAt" | "savedAt" | "appliedAt">,
): "Applied" | "Saved" | "New" | null {
  if (posting.appliedAt) return "Applied";
  if (posting.savedAt) return "Saved";
  return isNew(posting) ? "New" : null;
}

export function PostingCard({
  posting,
  profileSkills,
  index,
  onBoard = false,
}: {
  posting: PostingView;
  profileSkills: string[];
  index: number;
  /** Job Board's own card variant (plans/jobs-job-board.md, Slice 4): shows "Applied"/"Saved <when>" with a
   *  "Mark not applied" undo, and hides itself the instant neither status is left. The New list never passes
   *  this. */
  onBoard?: boolean;
}) {
  const [saved, setSaved] = useState(posting.savedAt != null);
  const [applied, setApplied] = useState(posting.appliedAt != null);
  const metaItems = [
    posting.workSetup && WORK_SETUP_LABELS[posting.workSetup],
    countryMeta(posting.countries ?? []),
    posting.jobType && JOB_TYPE_LABELS[posting.jobType],
    posting.seniority && SENIORITY_LABELS[posting.seniority],
    timeAgo(posting.sourcePostedAt ?? posting.firstSeenAt),
  ].filter((item): item is string => Boolean(item));
  // freehire's own snippet is sometimes empty even after processing (no source teaser for that posting).
  // fullDescription fills in when the full page was read; summary is what's left for a Partial posting
  // (every source's page failed to read), which never gets a fullDescription at all.
  const previewText = posting.snippet || posting.fullDescription || posting.summary || "";
  const allSkillMatches = matchSkills(posting.skills, profileSkills);
  const skillMatches = allSkillMatches.slice(0, MAX_SKILLS);
  const overflow = posting.skills.length - skillMatches.length;
  const ats = atsScore(allSkillMatches);
  const haveSkillCount = allSkillMatches.filter((match) => match.status === "have").length;
  const link = posting.sources[0]?.link;
  const { onApplyClick, dialog } = useApplyFlow({ postingId: posting.id, link });
  // Each card starts idle/empty regardless of a tailored resume or cover letter generated earlier from the
  // detail page (docs/architecture/job-card-actions.md: "no backend changes beyond the ATS formula" -- knowing
  // which cards already have one would need a new New-list query join, out of this slice's scope). Clicking
  // Tailor CV/Write cover letter again on such a posting just regenerates it, the same idempotent upsert either
  // button already does, not a destructive restart.
  const { status: tailorStatus, onTailorClick } = useTailorFlow({ postingId: posting.id });
  const [tailorMadeAt, setTailorMadeAt] = useState<Date | null>(null);
  useEffect(() => {
    if (tailorStatus === "ready") setTailorMadeAt(new Date());
  }, [tailorStatus]);
  const [tailorModalOpen, setTailorModalOpen] = useState(false);
  const coverLetterFlow = useCoverLetterFlow({ postingId: posting.id, initial: null });
  const [letterModalOpen, setLetterModalOpen] = useState(false);
  const badge = postingBadge({
    viewedAt: posting.viewedAt,
    firstSeenAt: posting.firstSeenAt,
    savedAt: saved ? new Date() : null,
    appliedAt: applied ? new Date() : null,
  });

  // Job Board shows only Saved/Applied postings -- once neither status is left, this card leaves the board
  // immediately (plans/jobs-job-board.md, Slice 4). The New list never passes onBoard, so it never hides.
  if (onBoard && !saved && !applied) return null;

  return (
    <div
      className="group fade-up-in relative rounded-xl border bg-card p-4 hover:bg-muted/40"
      style={{ animationDelay: `${Math.min(50 + (index % PAGE_SIZE) * 70, 330)}ms` }}
    >
      <Link href={`/jobs/${posting.id}`} className="absolute inset-0" aria-label={posting.title}>
        <span className="sr-only">
          {posting.title} at {posting.company}
        </span>
      </Link>
      <div className="pointer-events-none relative flex gap-3">
        <CompanyAvatar company={posting.company} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold underline-offset-2 group-hover:underline">{posting.title}</p>
                {badge && (
                  <Badge className="h-5 gap-1 px-1.5 text-[10px]">
                    {badge === "Saved" && <Bookmark className="size-3 fill-current" />}
                    {badge === "Applied" && <Check className="size-3" />}
                    {badge}
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{posting.company}</p>
            </div>
            <div className="pointer-events-auto relative z-10 flex shrink-0 items-center gap-2">
              <SaveButton postingId={posting.id} title={posting.title} saved={saved} onSavedChange={setSaved} />
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {metaItems.map((item, index) => (
              <span key={item} className="flex items-center gap-2">
                {index > 0 && <DotSeparator />}
                {item}
              </span>
            ))}
          </div>

          {previewText && <p className="mt-2.5 line-clamp-2 text-sm text-card-foreground">{previewText}</p>}

          {posting.skills.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {skillMatches.map((match) => (
                <SkillBadge key={match.skill} match={match} />
              ))}
              {overflow > 0 && <Badge variant="secondary">+{overflow}</Badge>}
            </div>
          )}

          {payRangeLabel(posting) && (
            <div className="mt-2 flex justify-end sm:hidden">
              <span className="text-xs font-medium text-muted-foreground">{payRangeLabel(posting)}</span>
            </div>
          )}
        </div>
      </div>

      <Separator className="mt-3" />
      <div className="pointer-events-auto relative z-10 mt-3 flex flex-wrap items-center gap-x-2 gap-y-3">
        <div className="flex items-center gap-3.5">
          {posting.score != null && (
            <ScoreRing
              value={posting.score}
              label="Match"
              tooltip={`${posting.score} out of 100 overall fit with your Profile`}
            />
          )}
          {ats != null && (
            <ScoreRing
              value={ats}
              label="ATS"
              tooltip={`${haveSkillCount} of ${allSkillMatches.length} posting skills in your Profile`}
            />
          )}
          {onBoard && applied && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              Applied <span className="font-mono">{timeAgo(posting.appliedAt ?? new Date())}</span>
              <MarkNotAppliedButton postingId={posting.id} onDone={() => setApplied(false)} />
            </div>
          )}
          {onBoard && !applied && saved && (
            <span className="text-xs text-muted-foreground">
              Saved <span className="font-mono">{timeAgo(posting.savedAt ?? new Date())}</span>
            </span>
          )}
        </div>
        <div className="order-3 flex basis-full flex-wrap items-center gap-2 sm:order-none sm:basis-auto sm:border-l sm:pl-3.5">
          <span
            className="rainbow-ring inline-flex rounded-4xl border-[1.5px] border-transparent"
            data-status={tailorStatus}
          >
            {tailorStatus === "ready" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-transparent"
                onClick={() => setTailorModalOpen(true)}
              >
                <FileText color="url(#rainbowGradient)" />
                View CV
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-transparent"
                disabled={tailorStatus === "pending"}
                onClick={onTailorClick}
              >
                {tailorStatus === "pending" ? (
                  <LoaderCircle color="url(#rainbowGradient)" className="animate-spin" />
                ) : (
                  <FileText color="url(#rainbowGradient)" />
                )}
                Tailor CV
              </Button>
            )}
          </span>
          <span
            className="rainbow-ring inline-flex rounded-4xl border-[1.5px] border-transparent"
            data-status={coverLetterFlow.status === "generating" ? "pending" : "ready"}
          >
            {coverLetterFlow.status === "ready" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-transparent"
                onClick={() => setLetterModalOpen(true)}
              >
                <Mail color="url(#rainbowGradient)" />
                View cover letter
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-transparent"
                disabled={coverLetterFlow.status === "generating"}
                onClick={coverLetterFlow.onWriteClick}
              >
                {coverLetterFlow.status === "generating" ? (
                  <LoaderCircle color="url(#rainbowGradient)" className="animate-spin" />
                ) : (
                  <Mail color="url(#rainbowGradient)" />
                )}
                Write cover letter
              </Button>
            )}
          </span>
        </div>
        <div className="order-2 ml-auto flex items-center gap-3 sm:order-none">
          {payRangeLabel(posting) && (
            <span className="hidden text-xs font-medium text-muted-foreground sm:inline">{payRangeLabel(posting)}</span>
          )}
          <Button type="button" size="sm" disabled={!link} onClick={onApplyClick} className="group/apply">
            Apply
            <ArrowUpRight className="transition-transform duration-200 ease-out group-hover/apply:translate-x-0.5 group-hover/apply:-translate-y-0.5" />
          </Button>
        </div>
      </div>
      {dialog}
      {coverLetterFlow.dialog}
      <Dialog open={tailorModalOpen} onOpenChange={setTailorModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tailored CV</DialogTitle>
            <DialogDescription>
              {posting.title} at {posting.company}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 rounded-lg border p-3.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-sm bg-muted">
              <FileText color="url(#rainbowGradient)" className="size-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">Tailored CV, PDF</p>
              <p className="text-xs text-muted-foreground">
                Made <span className="font-mono">{madeOnLabel(tailorMadeAt ?? new Date())}</span>
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            {tailorStatus === "ready" ? (
              <TailoredCvActions postingId={posting.id} onRegenerateClick={onTailorClick} />
            ) : (
              <Button type="button" variant="outline" disabled={tailorStatus === "pending"} onClick={onTailorClick}>
                {tailorStatus === "pending" ? (
                  <LoaderCircle color="url(#rainbowGradient)" className="animate-spin" />
                ) : (
                  <FileText color="url(#rainbowGradient)" />
                )}
                Tailor CV
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={letterModalOpen} onOpenChange={setLetterModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cover letter</DialogTitle>
            <DialogDescription>
              {posting.title} at {posting.company}
            </DialogDescription>
          </DialogHeader>
          <CoverLetterTab
            status={coverLetterFlow.status}
            content={coverLetterFlow.content}
            onContentChange={coverLetterFlow.setContent}
            edited={coverLetterFlow.edited}
            regenerating={coverLetterFlow.regenerating}
            generatedAt={coverLetterFlow.generatedAt}
            onWriteClick={coverLetterFlow.onWriteClick}
            onRegenerateClick={coverLetterFlow.onRegenerateClick}
            onSaveClick={coverLetterFlow.onSaveClick}
            onCopyClick={coverLetterFlow.onCopyClick}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function NewList({ postings, profileSkills }: { postings: PostingView[]; profileSkills: string[] }) {
  return (
    <div className="flex flex-col gap-3">
      {/* Shared def for the card actions' rainbow-stroked icons (same technique as posting-detail.tsx's title
          row): defined once here, not per card, so multiple cards on one page don't each repeat the id. */}
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <linearGradient id="rainbowGradient" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="oklch(0.62 0.2 25)" />
            <stop offset="0.3" stopColor="oklch(0.72 0.16 75)" />
            <stop offset="0.55" stopColor="oklch(0.62 0.17 150)" />
            <stop offset="0.8" stopColor="oklch(0.6 0.15 230)" />
            <stop offset="1" stopColor="oklch(0.58 0.2 295)" />
          </linearGradient>
        </defs>
      </svg>
      {postings.map((posting, index) => (
        <PostingCard key={posting.id} posting={posting} profileSkills={profileSkills} index={index} />
      ))}
      {postings.length === 0 && <p className="p-4 text-sm text-muted-foreground">No new postings</p>}
    </div>
  );
}

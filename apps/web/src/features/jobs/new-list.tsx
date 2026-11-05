"use client";

import { ArrowUpRight, Bookmark } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { DotSeparator } from "@/components/dot-separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CompanyAvatar } from "@/features/jobs/company-avatar";
import { countryFlag, countryName } from "@/features/jobs/country-flags";
import { matchSkills } from "@/features/jobs/skills-match";
import type { PostingView } from "@/features/jobs/store";
import { timeAgo } from "@/features/jobs/time-ago";
import { SkillBadge } from "./skill-badge";

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

function SaveButton({ title }: { title: string }) {
  const [saved, setSaved] = useState(false);
  return (
    <Button
      type="button"
      variant={saved ? "secondary" : "outline"}
      size="icon-sm"
      aria-pressed={saved}
      aria-label={saved ? `Unsave ${title}` : `Save ${title}`}
      onClick={(event) => {
        event.preventDefault();
        setSaved((value) => !value);
      }}
      className="shrink-0"
    >
      <Bookmark className={saved ? "fill-current" : undefined} />
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

export function NewList({ postings, profileSkills }: { postings: PostingView[]; profileSkills: string[] }) {
  return (
    <div className="flex flex-col gap-3">
      {postings.map((posting, index) => {
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
        const skillMatches = matchSkills(posting.skills, profileSkills).slice(0, MAX_SKILLS);
        const overflow = posting.skills.length - skillMatches.length;
        const link = posting.sources[0]?.link;

        return (
          <div
            key={posting.id}
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
                      {isNew(posting) && <Badge className="h-5 px-1.5 text-[10px]">New</Badge>}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{posting.company}</p>
                  </div>
                  <div className="pointer-events-auto relative z-10 flex shrink-0 items-center gap-2">
                    {posting.score != null && (
                      <Badge variant="outline" className="h-8 gap-1 rounded-4xl px-3 text-sm">
                        {posting.score}
                        <span className="font-normal text-muted-foreground">match</span>
                      </Badge>
                    )}
                    <SaveButton title={posting.title} />
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
                  <div className="mt-2 flex justify-end">
                    <span className="text-xs font-medium text-muted-foreground">{payRangeLabel(posting)}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator className="mt-3" />
            <div className="pointer-events-auto relative z-10 mt-3 flex justify-end">
              <Button type="button" size="sm" disabled={!link} asChild={Boolean(link)}>
                {link ? (
                  <a href={link} target="_blank" rel="noopener noreferrer" className="group/apply">
                    Apply
                    <ArrowUpRight className="transition-transform duration-200 ease-out group-hover/apply:translate-x-0.5 group-hover/apply:-translate-y-0.5" />
                  </a>
                ) : (
                  <>
                    Apply
                    <ArrowUpRight />
                  </>
                )}
              </Button>
            </div>
          </div>
        );
      })}
      {postings.length === 0 && <p className="p-4 text-sm text-muted-foreground">No new postings</p>}
    </div>
  );
}

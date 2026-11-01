"use client";

import { Bookmark } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { countryFlag, countryName } from "@/features/jobs/country-flags";
import type { PostingView } from "@/features/jobs/store";

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

function SaveButton({ title }: { title: string }) {
  const [saved, setSaved] = useState(false);
  return (
    <Button
      type="button"
      variant={saved ? "secondary" : "outline"}
      size="sm"
      aria-pressed={saved}
      aria-label={saved ? `Unsave ${title}` : `Save ${title}`}
      onClick={(event) => {
        event.preventDefault();
        setSaved((value) => !value);
      }}
      className="shrink-0 gap-1.5"
    >
      <Bookmark className={saved ? "fill-current" : undefined} />
      {saved ? "Saved" : "Save"}
    </Button>
  );
}

export function NewList({ postings }: { postings: PostingView[] }) {
  return (
    <div className="flex flex-col gap-3">
      {postings.map((posting) => {
        const metaItems = [
          posting.workSetup && WORK_SETUP_LABELS[posting.workSetup],
          countryMeta(posting.countries ?? []),
          posting.jobType && JOB_TYPE_LABELS[posting.jobType],
          posting.seniority && SENIORITY_LABELS[posting.seniority],
        ].filter((item): item is string => Boolean(item));
        const skills = posting.skills.slice(0, MAX_SKILLS);
        const overflow = posting.skills.length - skills.length;

        return (
          <div key={posting.id} className="relative rounded-xl border bg-card p-4 hover:bg-muted/40">
            <Link href={`/jobs/${posting.id}`} className="absolute inset-0" aria-label={posting.title}>
              <span className="sr-only">
                {posting.title} at {posting.company}
              </span>
            </Link>
            <div className="relative flex gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-semibold text-muted-foreground">
                {initials(posting.company)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{posting.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{posting.company}</p>
                  </div>
                  <div className="relative z-10 flex shrink-0 items-center gap-2">
                    {posting.score != null && (
                      <Badge variant="outline" className="gap-1 font-mono">
                        {posting.score}
                        <span className="font-sans font-normal text-muted-foreground">match</span>
                      </Badge>
                    )}
                    <SaveButton title={posting.title} />
                  </div>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {metaItems.map((item, index) => (
                    <span key={item} className="flex items-center gap-2">
                      {index > 0 && <span className="text-border">·</span>}
                      {item}
                    </span>
                  ))}
                </div>

                <p className="mt-2.5 line-clamp-2 text-sm text-card-foreground">{posting.snippet}</p>

                {posting.skills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {skills.map((skill) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                    {overflow > 0 && <Badge variant="secondary">+{overflow}</Badge>}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {postings.length === 0 && <p className="p-4 text-sm text-muted-foreground">No new postings</p>}
    </div>
  );
}

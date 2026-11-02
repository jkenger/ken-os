import { AlertTriangle, Bookmark, CircleHelp, ExternalLink, FileText } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { DotSeparator } from "@/components/dot-separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { countryName } from "@/features/jobs/country-flags";
import { formatBoardName } from "@/features/jobs/job-boards";
import type { WorkSetup } from "@/features/jobs/preferences-store";
import { requirementMismatches } from "@/features/jobs/requirement-mismatches";
import { sanitizeDescriptionHtml } from "@/features/jobs/sanitize-description";
import { formatSkillName, skillEntry } from "@/features/jobs/skills-dictionary";
import { matchSkills } from "@/features/jobs/skills-match";
import type { PostingView } from "@/features/jobs/store";
import { timeAgo } from "@/features/jobs/time-ago";
import { CountryAvatarGroup } from "./country-avatar-group";
import { EmptyState } from "./empty-state";
import { SkillBadge, SkillGroup } from "./skill-badge";
import { SkillLogo } from "./skill-logo";

// The job detail page (docs/mockups/Jobs redesign.html, "Desktop / Job detail"): a full page, not a side panel.
// Left is the profile match rail (score, skills matching, metadata); right is the posting itself. Mark
// applied/Dismiss/Save to board/Tailor my CV stay inert here -- acting on a match and CV tailoring are both their
// own, separate story.

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

function initials(company: string): string {
  const words = company.trim().split(/\s+/).filter(Boolean);
  return (words[0]?.[0] ?? "?").toUpperCase() + (words[1]?.[0] ?? "").toUpperCase();
}

function payLabel(posting: PostingView): string | null {
  if (posting.payAmount == null || !posting.payCurrency || !posting.payPeriod) return null;
  return `${posting.payCurrency} ${Math.round(posting.payAmount).toLocaleString()} a ${posting.payPeriod}`;
}

function MetaRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export function PostingDetail({
  posting,
  profileSkills,
  yearsExperience,
  preferredWorkSetups,
}: {
  posting: PostingView;
  profileSkills: string[];
  /** From the Profile's own experience dates (`years-of-experience.ts`). Null when the Profile has no Experience
   *  entries at all, not a verified zero. */
  yearsExperience: number | null;
  /** The owner's own `job_preferences.workSetups`, for the work-setup mismatch check. */
  preferredWorkSetups: WorkSetup[];
}) {
  const link = posting.sources[0]?.link;
  const skillMatches = matchSkills(posting.skills, profileSkills);
  const mismatches = requirementMismatches(
    { yearsRequired: posting.yearsRequired, workSetup: posting.workSetup },
    { yearsExperience, preferredWorkSetups },
  );
  const text = posting.fullDescription ?? posting.summary;
  const descriptionHtml = sanitizeDescriptionHtml(posting.descriptionHtml);
  const countries = posting.countries ?? [];

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[19rem_1fr]">
      <aside className="flex flex-col gap-5 rounded-xl border bg-card p-5 lg:sticky lg:top-[4.25rem]">
        {posting.score != null && (
          <div className="grid gap-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase">Profile match</h2>
            <span className="text-4xl font-semibold">
              {posting.score}
              <span className="text-lg text-muted-foreground">%</span>
            </span>
            <Progress value={posting.score} />
          </div>
        )}

        {skillMatches.length > 0 && (
          <div className="grid gap-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase">Skills</h2>
              <span className="text-xs text-muted-foreground">
                {skillMatches.filter((match) => match.status === "have").length} of {skillMatches.length} in your
                Profile
              </span>
            </div>
            <SkillGroup label="Have" matches={skillMatches.filter((match) => match.status === "have")} />
            <SkillGroup label="Related" matches={skillMatches.filter((match) => match.status === "related")} />
            <SkillGroup label="Missing" matches={skillMatches.filter((match) => match.status === "missing")} />
          </div>
        )}

        {mismatches.length > 0 && (
          <div className="grid gap-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase">Things to check</h2>
            <ul className="grid gap-1.5">
              {mismatches.map((mismatch) => (
                <li key={mismatch} className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="size-3.5 shrink-0 translate-y-0.5" />
                  {mismatch}
                </li>
              ))}
            </ul>
          </div>
        )}

        <hr className="border-border" />

        <div className="grid gap-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase">This job</h2>
          {posting.workSetup && <MetaRow label="Work format" value={WORK_SETUP_LABELS[posting.workSetup]} />}
          {posting.seniority && (
            <MetaRow label="Seniority" value={SENIORITY_LABELS[posting.seniority] ?? posting.seniority} />
          )}
          {posting.jobType && <MetaRow label="Job type" value={JOB_TYPE_LABELS[posting.jobType]} />}
          {payLabel(posting) && <MetaRow label="Pay" value={payLabel(posting)} />}
          <MetaRow
            label="Location"
            value={
              <>
                {posting.workSetup && `${WORK_SETUP_LABELS[posting.workSetup]}, `}
                {countries.length > 0 ? countries.map((code) => countryName(code)).join(", ") : "Not listed"}
              </>
            }
          />
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
            <span className="text-xs text-muted-foreground">Country</span>
            <CountryAvatarGroup countries={countries} />
          </div>
        </div>

        {posting.originBoard && (
          <>
            <hr className="border-border" />
            <div className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <span>Sourced from</span>
              <Link
                href={`/jobs?board=${posting.originBoard}`}
                className="font-medium text-foreground underline underline-offset-2 transition-colors hover:text-ring"
              >
                {formatBoardName(posting.originBoard)}
              </Link>
            </div>
          </>
        )}
      </aside>

      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-muted text-base font-semibold text-muted-foreground">
              {initials(posting.company)}
            </span>
            <span className="font-medium">{posting.company}</span>
          </div>
          <div className="text-right">
            <p className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
              <span>Posted {timeAgo(posting.sourcePostedAt ?? posting.firstSeenAt)}</span>
              {posting.sourceUpdatedAt && (
                <>
                  <DotSeparator />
                  <span>Updated {timeAgo(posting.sourceUpdatedAt)}</span>
                </>
              )}
            </p>
            <Button type="button" variant="outline" size="xs" disabled className="mt-1.5">
              <Bookmark />
              Save to board
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="max-w-xl text-2xl font-semibold">{posting.title}</h1>
          <div className="flex shrink-0 gap-2.5">
            <Button type="button" variant="outline" disabled>
              <FileText />
              Tailor my CV
            </Button>
            {link ? (
              <Button type="button" asChild>
                <a href={link} target="_blank" rel="noopener noreferrer">
                  Apply
                  <ExternalLink />
                </a>
              </Button>
            ) : (
              <Button type="button" disabled>
                Apply
                <ExternalLink />
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="description">
          <TabsList>
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="company">Company</TabsTrigger>
          </TabsList>
          <TabsContent value="description" className="grid gap-3 text-sm leading-relaxed">
            {descriptionHtml ? (
              <div
                className="grid gap-3 [&_a]:underline [&_a]:underline-offset-2 [&_li]:ml-4 [&_ol]:list-decimal [&_strong]:font-semibold [&_ul]:list-disc"
                dangerouslySetInnerHTML={{ __html: descriptionHtml }}
              />
            ) : (
              <p className="whitespace-pre-wrap">{text ?? "Not processed yet."}</p>
            )}

            {posting.skills.length > 0 && (
              <>
                <hr className="border-border" />
                <div className="grid gap-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {posting.skills.map((skill) => {
                      const entry = skillEntry(skill);
                      const name = formatSkillName(skill);
                      return (
                        <div
                          key={skill}
                          className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-sm shadow-xs"
                        >
                          {entry?.logoSlug && <SkillLogo slug={entry.logoSlug} alt="" className="size-4" />}
                          {name}
                          {entry?.description && (
                            <Tooltip>
                              <TooltipTrigger aria-label={`About ${name}`}>
                                <CircleHelp className="size-3.5 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>{entry.description}</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </TabsContent>
          <TabsContent value="company">
            <EmptyState
              title="No company details yet"
              message={`Neither the source nor the posting says more about ${posting.company}.`}
              action={
                link && (
                  <Button type="button" variant="outline" size="sm" asChild>
                    <a href={link} target="_blank" rel="noopener noreferrer">
                      Open posting
                      <ExternalLink />
                    </a>
                  </Button>
                )
              }
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

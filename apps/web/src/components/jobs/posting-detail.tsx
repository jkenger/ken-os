import { CheckCircle2, CircleDashed } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { matchSkills } from "@/features/jobs/skills-match";
import type { PostingView } from "@/features/jobs/store";
import { timeAgo } from "@/features/jobs/time-ago";
import { CountryAvatarGroup } from "./country-avatar-group";

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
    <div className="grid gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export function PostingDetail({ posting, profileSkills }: { posting: PostingView; profileSkills: string[] }) {
  const link = posting.sources[0]?.link;
  const skillMatches = matchSkills(posting.skills, profileSkills);
  const text = posting.fullDescription ?? posting.summary;
  const countries = posting.countries ?? [];

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[19rem_1fr]">
      <aside className="flex flex-col gap-5 rounded-xl border bg-card p-5">
        {posting.score != null && (
          <div className="grid gap-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase">Profile match</h2>
            <span className="font-mono text-4xl font-semibold">{posting.score}%</span>
            <Progress value={posting.score} />
          </div>
        )}

        {skillMatches.length > 0 && (
          <div className="grid gap-2">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase">Skills</h2>
              <span className="text-xs text-muted-foreground">
                {skillMatches.filter((s) => s.inProfile).length} of {skillMatches.length} in your Profile
              </span>
            </div>
            <ul className="grid gap-1.5">
              {skillMatches.map(({ skill, inProfile }) => (
                <li key={skill} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2">
                    {inProfile ? (
                      <CheckCircle2 className="size-4 shrink-0 text-foreground" />
                    ) : (
                      <CircleDashed className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    {skill}
                  </span>
                  <span className="text-xs text-muted-foreground">{inProfile ? "In Profile" : "Missing"}</span>
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
              <span className="flex items-center gap-1.5">
                {posting.workSetup && `${WORK_SETUP_LABELS[posting.workSetup]},`}
                <CountryAvatarGroup countries={countries} />
              </span>
            }
          />
          <MetaRow label="Country" value={<CountryAvatarGroup countries={countries} />} />
        </div>
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
            <p className="font-mono text-xs text-muted-foreground">
              Posted {timeAgo(posting.sourcePostedAt ?? posting.firstSeenAt)}
              {posting.sourceUpdatedAt && <> &middot; Updated {timeAgo(posting.sourceUpdatedAt)}</>}
            </p>
            <Button type="button" variant="outline" size="xs" disabled className="mt-1.5">
              Save to board
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="max-w-xl text-2xl font-semibold">{posting.title}</h1>
          <div className="flex shrink-0 gap-2.5">
            <Button type="button" variant="outline" disabled>
              Tailor my CV
            </Button>
            {link ? (
              <Button type="button" asChild>
                <a href={link} target="_blank" rel="noopener noreferrer">
                  Apply
                </a>
              </Button>
            ) : (
              <Button type="button" disabled>
                Apply
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="description">
          <TabsList>
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="company">Company</TabsTrigger>
          </TabsList>
          <TabsContent value="description" className="grid gap-3 text-sm leading-relaxed whitespace-pre-wrap">
            {text ?? "Not processed yet."}
          </TabsContent>
          <TabsContent value="company">
            <div className="grid gap-1 rounded-xl border p-6 text-center text-muted-foreground">
              <p className="text-sm font-semibold text-foreground">No company details yet</p>
              <p className="text-sm">Neither the source nor the posting says more about {posting.company}.</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { IconCheck, IconCircleCheck, IconCircleDashed, IconPencil } from "@tabler/icons-react";
import type { ProfileDetails } from "@ken-os/domain";
import { Button } from "@/components/ui/button";
import { panel } from "@/components/surfaces";
import type { LedgerRow, LedgerSectionId } from "@/features/profile/ledger";
import type { ReviewIssue } from "@/features/profile/review";
import { cn } from "@/lib/utils";
import { shortDate } from "./dates";
import { StateBadge } from "./profile-ledger";
import { IssueBadge } from "./profile-sections";

// Profile's header, Review and section index. The header is the Contact section: the name is the page's h1, and its
// Edit opens the Contact form in place like every other section.

const bare = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate">{children}</dd>
    </div>
  );
}

const missing = <span className="text-muted-foreground">-</span>;

export function ProfileHeader({
  contact,
  row,
  issues,
  savedAt,
  live,
  editing,
  onEdit,
  onDone,
  form,
}: {
  contact: ProfileDetails["contact"];
  row: LedgerRow;
  issues: number;
  savedAt: string | null;
  live: { version: number; publishedAt: string } | null;
  editing: boolean;
  onEdit: () => void;
  onDone: () => void;
  form: ReactNode;
}) {
  const place = [contact.city, contact.country].filter(Boolean).join(", ");
  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      className={cn(panel, "scroll-mt-16 p-5", editing && "ring-1 ring-selected/40")}
    >
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <h1 id="contact-title" className="font-heading text-2xl leading-tight font-semibold tracking-tight">
            {contact.fullName || "Your name"}
          </h1>
          <p className="mt-1 text-muted-foreground">{[contact.headline, place].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex items-center gap-2">
          <StateBadge state={row.state} />
          <IssueBadge count={issues} />
          {editing ? (
            <Button type="button" variant="outline" size="sm" onClick={onDone}>
              <IconCheck data-icon="inline-start" aria-hidden="true" />
              Done
            </Button>
          ) : (
            <Button type="button" variant="ghost" size="sm" onClick={onEdit} aria-label="Edit Contact">
              <IconPencil data-icon="inline-start" aria-hidden="true" />
              Edit
            </Button>
          )}
        </div>
      </div>
      <div className="mt-4 border-t pt-4">
        {editing ? (
          form
        ) : (
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <Fact label="Email">{contact.email || missing}</Fact>
            <Fact label="Phone">{contact.phone || missing}</Fact>
            <Fact label="Location">{place || missing}</Fact>
            <Fact label="Links">
              {contact.links.length
                ? contact.links.map((link, index) => (
                    <span key={index}>
                      {index > 0 && ", "}
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline-offset-4 hover:underline"
                      >
                        {link.label || bare(link.url)}
                      </a>
                    </span>
                  ))
                : missing}
            </Fact>
            <Fact label="Saved">{savedAt ? shortDate(savedAt) : "Not saved"}</Fact>
            <Fact label="Public">
              {live ? `Version ${live.version}, ${shortDate(live.publishedAt)}` : "Not published"}
            </Fact>
          </dl>
        )}
      </div>
    </section>
  );
}

/** What a reader would miss, as a count and one line per issue that jumps to its section, and the filled sections
 *  as a bar at its true ratio. */
export function ReviewPanel({
  issues,
  rows,
  onOpen,
}: {
  issues: ReviewIssue[];
  rows: LedgerRow[];
  onOpen: (id: LedgerSectionId) => void;
}) {
  const filled = rows.filter((row) => row.count > 0).length;
  const titles = Object.fromEntries(rows.map((row) => [row.id, row.title]));
  return (
    <section aria-labelledby="review-title" className={cn(panel, "p-5")}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="review-title" className="font-heading text-base font-semibold">
          Review
        </h2>
        <span className="text-muted-foreground">{issues.length ? `${issues.length} issues` : "No issues"}</span>
      </div>
      <div className="mt-3">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Sections filled</span>
          <span className="font-mono">
            {filled} of {rows.length}
          </span>
        </div>
        <div
          className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label={`${filled} of ${rows.length} sections filled`}
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${(filled / rows.length) * 100}%` }} />
        </div>
      </div>
      {issues.length > 0 && (
        <ul className="mt-4 divide-y border-t">
          {issues.map((issue) => (
            <li key={issue.id}>
              <Button
                type="button"
                variant="ghost"
                className="h-auto w-full justify-start gap-3 rounded-none px-0 py-2 text-left font-normal whitespace-normal hover:bg-transparent hover:underline"
                onClick={() => onOpen(issue.section)}
              >
                <span className="w-24 shrink-0 text-xs text-muted-foreground">{titles[issue.section]}</span>
                <span className="min-w-0 flex-1">{issue.text}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** The page's table of contents: every section with whether it's filled and its issues, then the right column's
 *  blocks. Links to the anchors, so it never opens a form. */
export function SectionIndex({ rows, issues }: { rows: LedgerRow[]; issues: ReviewIssue[] }) {
  const count = (id: LedgerSectionId) => issues.filter((issue) => issue.section === id).length;
  return (
    <nav aria-label="Profile sections" className="flex flex-col gap-0.5">
      {rows.map((row) => {
        const Filled = row.count ? IconCircleCheck : IconCircleDashed;
        const open = count(row.id);
        return (
          <Link
            key={row.id}
            href={`#${row.id}`}
            className="flex h-8 items-center gap-2 rounded-md px-2 text-sm hover:bg-sidebar-accent"
          >
            <Filled
              size={16}
              aria-hidden="true"
              className={row.count ? "text-topic-learned" : "text-muted-foreground"}
            />
            <span className="min-w-0 flex-1 truncate">{row.title}</span>
            {open > 0 && (
              <span className="font-mono text-xs text-muted-foreground" aria-label={`${open} issues`}>
                {open}
              </span>
            )}
          </Link>
        );
      })}
      <div className="my-2 border-t" />
      {[
        ["#resumes", "Resumes"],
        ["#public-link", "Public resume"],
        ["/profile/resume", "Printable resume"],
      ].map(([href, label]) => (
        <Link
          key={href}
          href={href}
          className="flex h-8 items-center rounded-md px-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

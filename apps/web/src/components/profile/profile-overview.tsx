"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  IconCircleCheck,
  IconCircleDashed,
  IconDeviceFloppy,
  IconLink,
  IconMail,
  IconMapPin,
  IconPencil,
  IconPhone,
  type Icon,
} from "@tabler/icons-react";
import type { ProfileDetails } from "@ken-os/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InlineSeparator } from "@/components/inline-separator";
import { panel } from "@/components/surfaces";
import type { LedgerRow, LedgerSectionId } from "@/features/profile/ledger";
import type { ReviewIssue } from "@/features/profile/review";
import { cn } from "@/lib/utils";
import { shortDate } from "./dates";
import { IssueBadge } from "./profile-sections";

// Profile's header, Review and section index. The header is the Contact section: the name is the page's h1, and its
// Edit opens the Contact form in place like every other section.

const bare = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

/** One contact fact: its icon in a neutral box, the label, then the value. */
function Fact({ label, icon: Icon, children }: { label: string; icon: Icon; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-md border bg-muted/60 text-muted-foreground">
        <Icon size={16} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="truncate">{children}</dd>
      </div>
    </div>
  );
}

const missing = <span className="text-muted-foreground">-</span>;

export function ProfileHeader({
  contact,
  issues,
  savedAt,
  editing,
  onEdit,
  form,
}: {
  contact: ProfileDetails["contact"];
  issues: number;
  savedAt: string | null;
  editing: boolean;
  onEdit: () => void;
  /** The Contact form with its Save and Cancel, shown while editing. */
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
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 text-muted-foreground">
            {contact.headline && <span>{contact.headline}</span>}
            {contact.headline && place && <InlineSeparator />}
            {place && <span>{place}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <IssueBadge count={issues} />
          {!editing && (
            <Button type="button" variant="ghost" size="icon" onClick={onEdit} aria-label="Edit Contact" title="Edit">
              <IconPencil aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
      <div className="mt-4 border-t pt-4">
        {editing ? (
          form
        ) : (
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <Fact label="Email" icon={IconMail}>
              {contact.email || missing}
            </Fact>
            <Fact label="Phone" icon={IconPhone}>
              {contact.phone || missing}
            </Fact>
            <Fact label="Location" icon={IconMapPin}>
              {place || missing}
            </Fact>
            <Fact label="Links" icon={IconLink}>
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
            <Fact label="Saved" icon={IconDeviceFloppy}>
              {savedAt ? shortDate(savedAt) : "Not saved"}
            </Fact>
          </dl>
        )}
      </div>
    </section>
  );
}

/** How complete the Profile is and what's missing: each issue names what to add and how much it adds, and jumps to
 *  its section. */
export function ReviewPanel({
  issues,
  score,
  rows,
  onOpen,
}: {
  issues: ReviewIssue[];
  /** 0 to 100, from profileScore. */
  score: number;
  rows: LedgerRow[];
  onOpen: (id: LedgerSectionId) => void;
}) {
  const titles = Object.fromEntries(rows.map((row) => [row.id, row.title]));
  return (
    <section aria-labelledby="review-title" className={cn(panel, "p-5")}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 id="review-title" className="font-heading text-base font-semibold">
          Review
        </h2>
        <Badge variant="outline" className="text-muted-foreground">
          {issues.length ? `${issues.length} ${issues.length === 1 ? "issue" : "issues"}` : "No issues"}
        </Badge>
        <p className="ml-auto flex items-baseline gap-1.5">
          <span className="font-heading text-2xl leading-none font-semibold tabular-nums">{score}%</span>
          <span className="text-muted-foreground">complete</span>
        </p>
      </div>
      {issues.length > 0 && (
        <ul className="mt-4 divide-y border-t">
          {issues.map((issue) => (
            <li key={issue.id}>
              <Button
                type="button"
                variant="ghost"
                className="-mx-2 h-auto w-[calc(100%+1rem)] justify-start gap-3 rounded-md px-2 py-2.5 text-left font-normal whitespace-normal hover:bg-muted/60"
                onClick={() => onOpen(issue.section)}
              >
                <Badge variant="secondary" className="w-12 shrink-0 justify-center font-mono tabular-nums">
                  +{Math.max(1, Math.round(issue.weight))}%
                </Badge>
                <span className="min-w-0 flex-1">{issue.text}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{titles[issue.section]}</span>
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

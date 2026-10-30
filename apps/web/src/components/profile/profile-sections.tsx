"use client";

import { useState, type ReactNode } from "react";
import { IconAlertCircle, IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { printDateRange, type ProfileDetails } from "@ken-os/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InlineSeparator } from "@/components/inline-separator";
import { panel } from "@/components/surfaces";
import type { LedgerRow, LedgerSectionId } from "@/features/profile/ledger";
import { cn } from "@/lib/utils";

// Profile's centre column: every section readable in place, each with its own Edit that turns the panel into that
// section's form. Long lists show three entries until "Show all". Optional sections left empty collect in one
// "Add more sections" panel instead of seven empty frames.

/** Sections that are never an issue when empty, so an empty one waits in "Add more sections". */
export const OPTIONAL_SECTIONS: readonly LedgerSectionId[] = [
  "projects",
  "certifications",
  "languages",
  "local-fields",
];

/** The singular noun each section adds, for "Add a role" style buttons and empty lines. */
const nouns: Record<LedgerSectionId, { add: string; empty: string }> = {
  contact: { add: "Add contact", empty: "No contact details" },
  summary: { add: "Write summary", empty: "No summary" },
  experience: { add: "Add role", empty: "No roles" },
  education: { add: "Add school", empty: "No schools" },
  skills: { add: "Add skills", empty: "No skills" },
  projects: { add: "Add project", empty: "No projects" },
  certifications: { add: "Add certification", empty: "No certifications" },
  languages: { add: "Add language", empty: "No languages" },
  "local-fields": { add: "Add local fields", empty: "Local fields off" },
};

export function addLabel(id: LedgerSectionId) {
  return nouns[id].add;
}

const LIST_CAP = 3;
const BULLET_CAP = 2;

/** The issue count beside a section title: a word and an icon, never colour alone. */
export function IssueBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <Badge
      variant="outline"
      className="border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300"
    >
      <IconAlertCircle data-icon="inline-start" aria-hidden="true" />
      Fix {count} {count === 1 ? "issue" : "issues"}
    </Badge>
  );
}

/** A section's panel: title, count and issues, then the read view or, while it's being edited, its form with Save and
 *  Cancel. The analyzer's cards sit under either. */
export function SectionPanel({
  row,
  issues,
  editing,
  onEdit,
  onDelete,
  form,
  children,
  analysis,
}: {
  row: LedgerRow;
  issues: number;
  editing: boolean;
  onEdit: () => void;
  /** Asks, then clears the section and saves. */
  onDelete: () => void;
  /** The section's form with its Save and Cancel, shown while editing. */
  form: ReactNode;
  children: ReactNode;
  /** The analyzer's cards for this section, under the content in read and edit mode alike. */
  analysis?: ReactNode;
}) {
  const titleId = `${row.id}-title`;
  return (
    <section
      id={row.id}
      aria-labelledby={titleId}
      className={cn(panel, "scroll-mt-16 p-5", editing && "ring-1 ring-selected/40")}
    >
      <div className="flex min-h-8 flex-wrap items-center gap-x-3 gap-y-2">
        <h2 id={titleId} className="font-heading text-base font-semibold">
          {row.title}
        </h2>
        {row.count > 0 && row.id !== "summary" && (
          <span className="font-mono text-xs text-muted-foreground">{row.count}</span>
        )}
        <IssueBadge count={issues} />
        {!editing && (
          <span className="ml-auto flex items-center gap-1">
            {row.count ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onEdit}
                  aria-label={`Edit ${row.title}`}
                  title="Edit"
                >
                  <IconPencil aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onDelete}
                  aria-label={`Delete ${row.title}`}
                  title="Delete"
                >
                  <IconTrash aria-hidden="true" />
                </Button>
              </>
            ) : (
              <Button type="button" variant="ghost" size="sm" onClick={onEdit} aria-label={`Edit ${row.title}`}>
                <IconPlus data-icon="inline-start" aria-hidden="true" />
                {nouns[row.id].add}
              </Button>
            )}
          </span>
        )}
      </div>
      <div className="mt-3">
        {editing ? form : row.count ? children : <p className="text-muted-foreground">{nouns[row.id].empty}</p>}
      </div>
      {analysis && <div className="mt-4 flex flex-col gap-3">{analysis}</div>}
    </section>
  );
}

/** Save and Cancel under a section's form. Save is off until something changed. */
export function EditActions({
  title,
  dirty,
  saving,
  onSave,
  onCancel,
}: {
  title: string;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-end gap-2 border-t pt-4">
      <span className="mr-auto text-sm text-muted-foreground">{dirty ? "Unsaved changes" : "No changes"}</span>
      <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
        Cancel
      </Button>
      <Button type="button" onClick={onSave} disabled={saving || !dirty} aria-label={`Save ${title}`}>
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}

/** "Show all 9 roles" under a capped list, and "Show fewer" once open. */
function ShowAll({
  total,
  noun,
  open,
  onToggle,
}: {
  total: number;
  noun: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <Button type="button" variant="link" size="sm" className="mt-2 h-auto px-0" onClick={onToggle}>
      {open ? "Show fewer" : `Show all ${total} ${noun}`}
    </Button>
  );
}

function useCap<T>(items: T[], cap = LIST_CAP) {
  const [open, setOpen] = useState(false);
  return {
    shown: open ? items : items.slice(0, cap),
    capped: items.length > cap,
    open,
    toggle: () => setOpen((value) => !value),
  };
}

function Bullets({ items, all }: { items: string[]; all: boolean }) {
  const lines = items.filter((item) => item.trim());
  const shown = all ? lines : lines.slice(0, BULLET_CAP);
  if (!lines.length) return null;
  return (
    <ul className="mt-1.5 list-disc space-y-1 pl-5 text-foreground/90">
      {shown.map((line, index) => (
        <li key={index}>{line}</li>
      ))}
      {!all && lines.length > BULLET_CAP && (
        <li className="list-none text-muted-foreground">{lines.length - BULLET_CAP} more</li>
      )}
    </ul>
  );
}

/** A list of entries split by 1px rules, each a title line, a meta line and optional body. */
function Entries({ children }: { children: ReactNode }) {
  return <ul className="divide-y [&>li]:py-3 [&>li:first-child]:pt-0 [&>li:last-child]:pb-0">{children}</ul>;
}

const join = (...parts: string[]) => parts.filter((part) => part.trim()).join(", ");

export function SummaryView({ summary }: { summary: string }) {
  const [open, setOpen] = useState(false);
  const long = summary.length > 360;
  return (
    <div>
      <p className={cn("leading-relaxed whitespace-pre-line", long && !open && "line-clamp-4")}>{summary}</p>
      {long && (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="mt-2 h-auto px-0"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Show less" : "Show more"}
        </Button>
      )}
    </div>
  );
}

export function ExperienceView({ experience }: { experience: ProfileDetails["experience"] }) {
  const { shown, capped, open, toggle } = useCap(experience);
  return (
    <>
      <Entries>
        {shown.map((role, index) => (
          <li key={index}>
            <p className="font-semibold">{role.title || "Untitled role"}</p>
            <p className="text-muted-foreground">{join(role.company, role.location)}</p>
            {role.start && <p className="text-muted-foreground">{printDateRange(role.start, role.end)}</p>}
            <Bullets items={role.bullets} all={open} />
          </li>
        ))}
      </Entries>
      {capped && <ShowAll total={experience.length} noun="roles" open={open} onToggle={toggle} />}
    </>
  );
}

export function EducationView({ education }: { education: ProfileDetails["education"] }) {
  const { shown, capped, open, toggle } = useCap(education);
  return (
    <>
      <Entries>
        {shown.map((school, index) => (
          <li key={index}>
            <p className="font-semibold">{school.school || "Untitled school"}</p>
            <p className="text-muted-foreground">{join(school.degree, school.field)}</p>
            {school.start && <p className="text-muted-foreground">{printDateRange(school.start, school.end)}</p>}
          </li>
        ))}
      </Entries>
      {capped && <ShowAll total={education.length} noun="schools" open={open} onToggle={toggle} />}
    </>
  );
}

/** Every skill in one row, split by thin rules; older Profiles with named groups show all their skills together. */
export function SkillsView({ skills }: { skills: ProfileDetails["skills"] }) {
  const items = skills.flatMap((group) => group.items).filter((item) => item.trim());
  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5" aria-label="Skills">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex items-center gap-3">
          {index > 0 && <InlineSeparator />}
          {item}
        </li>
      ))}
    </ul>
  );
}

export function ProjectsView({ projects }: { projects: ProfileDetails["projects"] }) {
  const { shown, capped, open, toggle } = useCap(projects);
  return (
    <>
      <Entries>
        {shown.map((project, index) => (
          <li key={index}>
            <p className="font-semibold">{project.name || "Untitled project"}</p>
            {project.link && (
              <p className="truncate text-muted-foreground">{project.link.replace(/^https?:\/\/(www\.)?/, "")}</p>
            )}
            {project.description && <p className="mt-1">{project.description}</p>}
            <Bullets items={project.bullets} all={open} />
          </li>
        ))}
      </Entries>
      {capped && <ShowAll total={projects.length} noun="projects" open={open} onToggle={toggle} />}
    </>
  );
}

export function CertificationsView({ certifications }: { certifications: ProfileDetails["certifications"] }) {
  return (
    <Entries>
      {certifications.map((cert, index) => (
        <li key={index}>
          <p className="font-semibold">{cert.name || "Untitled certification"}</p>
          <p className="text-muted-foreground">{join(cert.issuer, cert.date)}</p>
        </li>
      ))}
    </Entries>
  );
}

export function LanguagesView({ languages }: { languages: ProfileDetails["languages"] }) {
  return (
    <dl className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-x-6 gap-y-2">
      {languages.map((language, index) => (
        <div key={index} className="contents">
          <dt>{language.name || "Language"}</dt>
          <dd className="text-muted-foreground">{language.level || "No level"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function LocalFieldsView({ local }: { local: ProfileDetails["local"] }) {
  const rows: [string, string][] = [
    ["Birthdate", local.birthdate],
    ["Civil status", local.civilStatus],
    ["Nationality", local.nationality],
    ["Address", local.address],
    ["References", local.references.filter((item) => item.trim()).join("; ")],
  ];
  return (
    <dl className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-x-6 gap-y-2">
      {rows
        .filter(([, value]) => value.trim())
        .map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
    </dl>
  );
}

/** The read view for one section, from the details as typed. */
export function SectionView({ id, details }: { id: LedgerSectionId; details: ProfileDetails }) {
  switch (id) {
    case "summary":
      return <SummaryView summary={details.summary} />;
    case "experience":
      return <ExperienceView experience={details.experience} />;
    case "education":
      return <EducationView education={details.education} />;
    case "skills":
      return <SkillsView skills={details.skills} />;
    case "projects":
      return <ProjectsView projects={details.projects} />;
    case "certifications":
      return <CertificationsView certifications={details.certifications} />;
    case "languages":
      return <LanguagesView languages={details.languages} />;
    case "local-fields":
      return <LocalFieldsView local={details.local} />;
    case "contact":
      return null;
  }
}

/** The optional sections still empty, as one panel of Add buttons. */
export function MoreSections({ rows, onAdd }: { rows: LedgerRow[]; onAdd: (id: LedgerSectionId) => void }) {
  if (!rows.length) return null;
  return (
    <section aria-labelledby="more-sections-title" className={cn(panel, "p-5")}>
      <h2 id="more-sections-title" className="font-heading text-base font-semibold">
        Add more sections
      </h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {rows.map((row) => (
          <Button key={row.id} type="button" variant="outline" size="sm" onClick={() => onAdd(row.id)}>
            <IconPlus data-icon="inline-start" aria-hidden="true" />
            {row.title}
          </Button>
        ))}
      </div>
    </section>
  );
}

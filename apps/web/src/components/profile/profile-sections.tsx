"use client";

import { useState, type ReactNode } from "react";
import { IconAlertCircle, IconCheck, IconPencil, IconPlus } from "@tabler/icons-react";
import { printDateRange, type ProfileDetails } from "@ken-os/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { panel } from "@/components/surfaces";
import type { LedgerRow, LedgerSectionId } from "@/features/profile/ledger";
import { cn } from "@/lib/utils";
import { StateBadge } from "./profile-ledger";

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
    <Badge variant="outline" className="text-muted-foreground">
      <IconAlertCircle data-icon="inline-start" aria-hidden="true" />
      {count} {count === 1 ? "issue" : "issues"}
    </Badge>
  );
}

/** A section's panel: title, state and issues, then the read view or, while it's being edited, its form. */
export function SectionPanel({
  row,
  issues,
  editing,
  onEdit,
  onDone,
  form,
  children,
}: {
  row: LedgerRow;
  issues: number;
  editing: boolean;
  onEdit: () => void;
  onDone: () => void;
  form: ReactNode;
  children: ReactNode;
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
        <StateBadge state={row.state} />
        <IssueBadge count={issues} />
        <span className="ml-auto">
          {editing ? (
            <Button type="button" variant="outline" size="sm" onClick={onDone}>
              <IconCheck data-icon="inline-start" aria-hidden="true" />
              Done
            </Button>
          ) : (
            <Button type="button" variant="ghost" size="sm" onClick={onEdit} aria-label={`Edit ${row.title}`}>
              {row.count ? (
                <IconPencil data-icon="inline-start" aria-hidden="true" />
              ) : (
                <IconPlus data-icon="inline-start" aria-hidden="true" />
              )}
              {row.count ? "Edit" : nouns[row.id].add}
            </Button>
          )}
        </span>
      </div>
      <div className="mt-3">
        {editing ? form : row.count ? children : <p className="text-muted-foreground">{nouns[row.id].empty}</p>}
      </div>
    </section>
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

const join = (...parts: string[]) => parts.filter((part) => part.trim()).join(" · ");

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

export function SkillsView({ skills }: { skills: ProfileDetails["skills"] }) {
  const { shown, capped, open, toggle } = useCap(skills, 4);
  return (
    <>
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]">
        {shown.map((group, index) => (
          <div key={index} className="contents">
            <dt className="text-muted-foreground">{group.name || "Skills"}</dt>
            <dd>{group.items.filter((item) => item.trim()).join(", ")}</dd>
          </div>
        ))}
      </dl>
      {capped && <ShowAll total={skills.length} noun="groups" open={open} onToggle={toggle} />}
    </>
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

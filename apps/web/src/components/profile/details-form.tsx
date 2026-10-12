"use client";

import type { ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { PROFILE_LIMITS, type ProfileDetails } from "@ken-os/domain";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

// The Profile form. Every field maps to one key of ProfileDetails; the server checks them again on save.

type Edit = (change: (details: ProfileDetails) => void) => void;

function Field({ id, label, helper, className, children }: { id: string; label: string; helper?: string; className?: string; children: ReactNode }) {
  return (
    <div className={className ? `grid gap-2 ${className}` : "grid gap-2"}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}

function Text({ id, label, value, onChange, type = "text", placeholder, helper, className, max = PROFILE_LIMITS.text }: {
  id: string; label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; helper?: string; className?: string; max?: number;
}) {
  return (
    <Field id={id} label={label} helper={helper} className={className}>
      <Input id={id} type={type} value={value} maxLength={max} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </Field>
  );
}

/** One bullet per line. Empty lines are kept while typing and dropped on save. */
function Lines({ id, label, value, onChange, helper = "One per line", rows = 4 }: { id: string; label: string; value: string[]; onChange: (value: string[]) => void; helper?: string; rows?: number }) {
  return (
    <Field id={id} label={label} helper={helper}>
      <Textarea id={id} rows={rows} value={value.join("\n")} onChange={(event) => onChange(event.target.value.split("\n"))} />
    </Field>
  );
}

function Section({ id, title, description, action, children }: { id: string; title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-24">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <Button type="button" variant="outline" size="sm" onClick={onClick}><Plus data-icon="inline-start" aria-hidden="true" />{label}</Button>;
}

/** A repeatable list of entries, each with its own Remove button, and a one-line empty state. */
function Entries<T>({ items, empty, noun, onRemove, children }: { items: T[]; empty: string; noun: string; onRemove: (index: number) => void; children: (item: T, index: number) => ReactNode }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="flex flex-col gap-5">
      {items.map((item, index) => (
        <div key={index} className="flex flex-col gap-4">
          {index > 0 && <Separator />}
          <div className="flex items-start gap-3">
            <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2">{children(item, index)}</div>
            <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${noun}`} title={`Remove ${noun}`} onClick={() => onRemove(index)}><Trash2 /></Button>
          </div>
        </div>
      ))}
    </div>
  );
}

const without = <T,>(items: T[], index: number) => items.filter((_, position) => position !== index);

export function DetailsForm({ details, edit }: { details: ProfileDetails; edit: Edit }) {
  const { contact, local } = details;
  return (
    <div className="flex flex-col gap-4">
      <Section id="contact" title="Contact">
        <div className="grid gap-4 sm:grid-cols-2">
          <Text id="full-name" label="Name" value={contact.fullName} onChange={(value) => edit((d) => { d.contact.fullName = value; })} />
          <Text id="headline" label="Headline" value={contact.headline} placeholder="Full-stack engineer" onChange={(value) => edit((d) => { d.contact.headline = value; })} />
          <Text id="email" label="Email" type="email" value={contact.email} onChange={(value) => edit((d) => { d.contact.email = value; })} />
          <Text id="phone" label="Phone" type="tel" value={contact.phone} onChange={(value) => edit((d) => { d.contact.phone = value; })} />
          <Text id="city" label="City" value={contact.city} onChange={(value) => edit((d) => { d.contact.city = value; })} />
          <Text id="country" label="Country" value={contact.country} onChange={(value) => edit((d) => { d.contact.country = value; })} />
        </div>
        <Separator className="my-5" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium">Links</h3>
          <AddButton label="Add link" onClick={() => edit((d) => { d.contact.links.push({ label: "", url: "" }); })} />
        </div>
        <Entries items={contact.links} noun="link" empty="LinkedIn, GitHub or a portfolio" onRemove={(index) => edit((d) => { d.contact.links = without(d.contact.links, index); })}>
          {(link, index) => <>
            <Text id={`link-${index}-label`} label="Label" value={link.label} placeholder="GitHub" onChange={(value) => edit((d) => { d.contact.links[index].label = value; })} />
            <Text id={`link-${index}-url`} label="Address" value={link.url} max={PROFILE_LIMITS.url} placeholder="github.com/you" onChange={(value) => edit((d) => { d.contact.links[index].url = value; })} />
          </>}
        </Entries>
      </Section>

      <Section id="summary" title="Summary">
        <Field id="summary-text" label="Summary" helper="Two to four sentences">
          <Textarea id="summary-text" rows={4} maxLength={PROFILE_LIMITS.summary} value={details.summary} onChange={(event) => edit((d) => { d.summary = event.target.value; })} />
        </Field>
      </Section>

      <Section id="experience" title="Experience" action={<AddButton label="Add role" onClick={() => edit((d) => { d.experience.push({ company: "", title: "", location: "", start: "", end: "", bullets: [] }); })} />}>
        <Entries items={details.experience} noun="role" empty="No roles yet" onRemove={(index) => edit((d) => { d.experience = without(d.experience, index); })}>
          {(role, index) => <>
            <Text id={`role-${index}-title`} label="Title" value={role.title} onChange={(value) => edit((d) => { d.experience[index].title = value; })} />
            <Text id={`role-${index}-company`} label="Company" value={role.company} onChange={(value) => edit((d) => { d.experience[index].company = value; })} />
            <Text id={`role-${index}-location`} label="Location" value={role.location} placeholder="Remote" className="sm:col-span-2" onChange={(value) => edit((d) => { d.experience[index].location = value; })} />
            <Text id={`role-${index}-start`} label="Start" type="month" value={role.start} onChange={(value) => edit((d) => { d.experience[index].start = value; })} />
            <Text id={`role-${index}-end`} label="End" type="month" value={role.end} helper="Empty for Present" onChange={(value) => edit((d) => { d.experience[index].end = value; })} />
            <div className="sm:col-span-2"><Lines id={`role-${index}-bullets`} label="Bullet points" value={role.bullets} onChange={(value) => edit((d) => { d.experience[index].bullets = value; })} /></div>
          </>}
        </Entries>
      </Section>

      <Section id="education" title="Education" action={<AddButton label="Add school" onClick={() => edit((d) => { d.education.push({ school: "", degree: "", field: "", start: "", end: "", notes: "" }); })} />}>
        <Entries items={details.education} noun="school" empty="No schools yet" onRemove={(index) => edit((d) => { d.education = without(d.education, index); })}>
          {(school, index) => <>
            <Text id={`school-${index}-name`} label="School" value={school.school} className="sm:col-span-2" onChange={(value) => edit((d) => { d.education[index].school = value; })} />
            <Text id={`school-${index}-degree`} label="Degree" value={school.degree} placeholder="BS" onChange={(value) => edit((d) => { d.education[index].degree = value; })} />
            <Text id={`school-${index}-field`} label="Field" value={school.field} placeholder="Computer Science" onChange={(value) => edit((d) => { d.education[index].field = value; })} />
            <Text id={`school-${index}-start`} label="Start" type="month" value={school.start} onChange={(value) => edit((d) => { d.education[index].start = value; })} />
            <Text id={`school-${index}-end`} label="End" type="month" value={school.end} onChange={(value) => edit((d) => { d.education[index].end = value; })} />
            <Text id={`school-${index}-notes`} label="Notes" value={school.notes} max={PROFILE_LIMITS.line} placeholder="Honors, thesis" className="sm:col-span-2" onChange={(value) => edit((d) => { d.education[index].notes = value; })} />
          </>}
        </Entries>
      </Section>

      <Section id="skills" title="Skills" action={<AddButton label="Add group" onClick={() => edit((d) => { d.skills.push({ name: "", items: [] }); })} />}>
        <Entries items={details.skills} noun="group" empty="No skills yet" onRemove={(index) => edit((d) => { d.skills = without(d.skills, index); })}>
          {(group, index) => <>
            <Text id={`skills-${index}-name`} label="Group" value={group.name} placeholder="Languages" onChange={(value) => edit((d) => { d.skills[index].name = value; })} />
            <Text id={`skills-${index}-items`} label="Skills" value={group.items.join(", ")} max={PROFILE_LIMITS.line * 4} placeholder="TypeScript, Go, SQL" helper="Separate with commas" onChange={(value) => edit((d) => { d.skills[index].items = value.split(/,\s*/); })} />
          </>}
        </Entries>
      </Section>

      <Section id="projects" title="Projects" action={<AddButton label="Add project" onClick={() => edit((d) => { d.projects.push({ name: "", link: "", description: "", bullets: [] }); })} />}>
        <Entries items={details.projects} noun="project" empty="No projects yet" onRemove={(index) => edit((d) => { d.projects = without(d.projects, index); })}>
          {(project, index) => <>
            <Text id={`project-${index}-name`} label="Name" value={project.name} onChange={(value) => edit((d) => { d.projects[index].name = value; })} />
            <Text id={`project-${index}-link`} label="Link" value={project.link} max={PROFILE_LIMITS.url} onChange={(value) => edit((d) => { d.projects[index].link = value; })} />
            <Text id={`project-${index}-description`} label="Description" value={project.description} max={PROFILE_LIMITS.line} className="sm:col-span-2" onChange={(value) => edit((d) => { d.projects[index].description = value; })} />
            <div className="sm:col-span-2"><Lines id={`project-${index}-bullets`} label="Bullet points" rows={3} value={project.bullets} onChange={(value) => edit((d) => { d.projects[index].bullets = value; })} /></div>
          </>}
        </Entries>
      </Section>

      <Section id="certifications" title="Certifications" action={<AddButton label="Add certification" onClick={() => edit((d) => { d.certifications.push({ name: "", issuer: "", date: "" }); })} />}>
        <Entries items={details.certifications} noun="certification" empty="No certifications yet" onRemove={(index) => edit((d) => { d.certifications = without(d.certifications, index); })}>
          {(cert, index) => <>
            <Text id={`cert-${index}-name`} label="Name" value={cert.name} className="sm:col-span-2" onChange={(value) => edit((d) => { d.certifications[index].name = value; })} />
            <Text id={`cert-${index}-issuer`} label="Issuer" value={cert.issuer} onChange={(value) => edit((d) => { d.certifications[index].issuer = value; })} />
            <Text id={`cert-${index}-date`} label="Date" type="month" value={cert.date} onChange={(value) => edit((d) => { d.certifications[index].date = value; })} />
          </>}
        </Entries>
      </Section>

      <Section id="languages" title="Languages" action={<AddButton label="Add language" onClick={() => edit((d) => { d.languages.push({ name: "", level: "" }); })} />}>
        <Entries items={details.languages} noun="language" empty="No languages yet" onRemove={(index) => edit((d) => { d.languages = without(d.languages, index); })}>
          {(language, index) => <>
            <Text id={`language-${index}-name`} label="Language" value={language.name} onChange={(value) => edit((d) => { d.languages[index].name = value; })} />
            <Text id={`language-${index}-level`} label="Level" value={language.level} placeholder="Native, Fluent" onChange={(value) => edit((d) => { d.languages[index].level = value; })} />
          </>}
        </Entries>
      </Section>

      <Section id="local-fields" title="Local fields" description="Left out of ATS templates"
        action={<div className="flex items-center gap-2"><Label htmlFor="local-enabled" className="text-sm font-normal">Show</Label><Switch id="local-enabled" checked={local.enabled} onCheckedChange={(checked) => edit((d) => { d.local.enabled = checked; })} /></div>}>
        {local.enabled ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Text id="birthdate" label="Birthdate" type="date" value={local.birthdate} onChange={(value) => edit((d) => { d.local.birthdate = value; })} />
            <Text id="civil-status" label="Civil status" value={local.civilStatus} onChange={(value) => edit((d) => { d.local.civilStatus = value; })} />
            <Text id="nationality" label="Nationality" value={local.nationality} onChange={(value) => edit((d) => { d.local.nationality = value; })} />
            <Text id="address" label="Address" value={local.address} max={PROFILE_LIMITS.line} onChange={(value) => edit((d) => { d.local.address = value; })} />
            <div className="sm:col-span-2"><Lines id="references" label="References" rows={3} helper="Name, role, contact. One per line" value={local.references} onChange={(value) => edit((d) => { d.local.references = value; })} /></div>
          </div>
        ) : <p className="text-sm text-muted-foreground">Birthdate, civil status, nationality, address and references</p>}
      </Section>
    </div>
  );
}

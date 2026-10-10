"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DisclosureSummary } from "@/components/ui/disclosure-summary";
import type { StoredSkill } from "@/lib/skills";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export function SkillManager({ skills }: { skills: StoredSkill[] }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<{
    id: string;
    message: string;
  } | null>(null);

  async function copyManifest(skill: StoredSkill) {
    try {
      await navigator.clipboard.writeText(skill.files["SKILL.md"]);
      setCopyStatus({
        id: skill.id,
        message: "Copied SKILL.md",
      });
    } catch {
      setCopyStatus({
        id: skill.id,
        message: "Couldn't copy. Download SKILL.md instead",
      });
    }
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    const input = event.currentTarget.elements.namedItem(
      "bundle",
    ) as HTMLInputElement;
    setBusy(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.set("bundle", file);
      const response = await fetch("/api/skills", {
        method: "POST",
        body: form,
      });
      const data = (await response.json()) as { error?: string; name?: string };
      if (!response.ok) throw new Error(data.error ?? "Upload failed. Try again");
      setMessage(
        `Added ${data.name ?? "skill"} · Off`,
      );
      setFile(null);
      input.value = "";
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed. Try again");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(skill: StoredSkill) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/skills/${encodeURIComponent(skill.id)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: !skill.enabled }),
        },
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(data.error ?? "Couldn't update. Try again");
      setMessage(
        `${skill.name} v${skill.version} ${skill.enabled ? "off" : "on"}`,
      );
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Couldn't update. Try again",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(300px,0.8fr)_minmax(400px,1.2fr)]">
      <section>
        <Card className="[--card-spacing:--spacing(6)]"><CardContent>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">Add skill</h2>
        <p className="mt-3 text-base leading-6 text-muted-foreground">
          <code>SKILL.md</code>, or a ZIP with <code>SKILL.md</code> and{" "}
          <code>references/*.md</code>
        </p>
        <form className="mt-7 grid gap-3" onSubmit={upload}>
          <Label className="block text-xs font-semibold" htmlFor="skill-bundle">Skill file</Label>
          <Input
            className="h-auto border-dashed p-3 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-2 file:py-1.5 file:text-xs file:font-medium"
            id="skill-bundle"
            name="bundle"
            type="file"
            accept=".md,.zip,application/zip,text/markdown"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <Button className="h-10 justify-self-start px-4" type="submit" disabled={!file || busy}>
            {busy ? "Working…" : "Add skill"}
          </Button>
        </form>
        <p className="mt-5 text-xs leading-5 text-muted-foreground">
          Off until you turn it on. Markdown only: no scripts, binaries or
          credentials
        </p>
        {message && (
          <p className="mt-4 rounded-lg bg-muted p-3 text-sm" role="status">
            {message}
          </p>
        )}
        </CardContent></Card>
      </section>
      <section className="grid gap-4">
        {skills.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {skills.length} version{skills.length === 1 ? "" : "s"}
          </p>
        )}
        {skills.length === 0 ? (
          <Card className="[--card-spacing:--spacing(6)]"><CardContent>
            <h2 className="font-heading text-xl font-semibold tracking-tight">No skills yet</h2>
            <p className="mt-3 text-base leading-6 text-muted-foreground">
              Markdown instructions the resume assistant can follow
            </p>
            <Button asChild variant="outline" className="mt-4 h-9 px-3">
              <Label htmlFor="skill-bundle" className="cursor-pointer">Add skill</Label>
            </Button>
          </CardContent></Card>
        ) : (
          skills.map((skill) => (
            <Card key={skill.id}><CardContent>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"><FileText size={15} aria-hidden="true" /></span>
                  <span className="truncate text-xs font-bold tracking-widest text-muted-foreground">{skill.slug} / v{skill.version}</span>
                </div>
                <span
                  className={`shrink-0 rounded-md px-2 py-1 text-xs font-bold uppercase tracking-widest ${skill.enabled ? "bg-secondary text-foreground" : "bg-background text-muted-foreground"}`}
                >
                  {skill.enabled ? "On" : "Off"}
                </span>
              </div>
              <h2 className="font-heading text-base font-semibold leading-6 tracking-tight">{skill.name}</h2>
              <p className="mt-0.5 text-sm leading-5 text-muted-foreground">{skill.description}</p>
              <p className="mt-2 text-sm leading-5 text-muted-foreground">
                {Object.keys(skill.files).length} Markdown file
                {Object.keys(skill.files).length === 1 ? "" : "s"} · Uploaded{" "}
                {new Date(skill.createdAt).toLocaleDateString()}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                <details className="group min-w-[min(100%,320px)]">
                  <DisclosureSummary className="text-xs font-semibold">Files and export</DisclosureSummary>
                  <div className="mt-4 max-w-xl">
                    <p className="text-xs leading-5 text-muted-foreground">
                      Doesn&apos;t change which version is on
                    </p>
                    <ul className="my-4 list-disc break-all pl-5 text-xs leading-6 text-muted-foreground">
                      {Object.keys(skill.files)
                        .sort()
                        .map((path) => (
                          <li key={path}>{path}</li>
                        ))}
                    </ul>
                    {Object.entries(skill.files)
                      .sort(([left], [right]) => left.localeCompare(right))
                      .map(([path, content]) => (
                        <details className="group mt-2 rounded-lg bg-muted p-3" key={path}>
                          <DisclosureSummary className="break-all text-xs font-medium">{path}</DisclosureSummary>
                          <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-all text-xs leading-5">{content}</pre>
                        </details>
                      ))}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" className="h-9 rounded-lg px-3 text-xs" type="button" onClick={() => void copyManifest(skill)}>
                        Copy SKILL.md
                      </Button>
                      <Button asChild variant="outline" size="sm" className="h-9 rounded-lg px-3 text-xs">
                        <a href={`/api/skills/${encodeURIComponent(skill.id)}/export?format=md`}>Download SKILL.md</a>
                      </Button>
                      <Button asChild variant="outline" size="sm" className="h-9 rounded-lg px-3 text-xs">
                        <a href={`/api/skills/${encodeURIComponent(skill.id)}/export?format=zip`}>Export ZIP</a>
                      </Button>
                    </div>
                    {copyStatus?.id === skill.id && (
                      <p className="mt-3 text-xs text-muted-foreground" role="status">
                        {copyStatus.message}
                      </p>
                    )}
                  </div>
                </details>
                <Button
                  className="h-9 px-3"
                  type="button"
                  variant={skill.enabled ? "outline" : "default"}
                  disabled={busy}
                  onClick={() => void toggle(skill)}
                >
                  {skill.enabled ? "Turn off" : "Turn on"}
                </Button>
              </div>
            </CardContent></Card>
          ))
        )}
      </section>
    </div>
  );
}

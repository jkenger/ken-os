"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import type { StoredSkill } from "@/lib/skills";

export function SkillManager({ skills }: { skills: StoredSkill[] }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<{ id: string; message: string } | null>(null);

  async function copyManifest(skill: StoredSkill) {
    try {
      await navigator.clipboard.writeText(skill.files["SKILL.md"]);
      setCopyStatus({ id: skill.id, message: `Copied ${skill.name} v${skill.version} SKILL.md.` });
    } catch {
      setCopyStatus({ id: skill.id, message: "Could not copy. Download SKILL.md instead." });
    }
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    const input = event.currentTarget.elements.namedItem("bundle") as HTMLInputElement;
    setBusy(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.set("bundle", file);
      const response = await fetch("/api/skills", { method: "POST", body: form });
      const data = await response.json() as { error?: string; name?: string };
      if (!response.ok) throw new Error(data.error ?? "Upload failed.");
      setMessage(`${data.name ?? "Skill"} saved. Review it below before enabling.`);
      setFile(null);
      input.value = "";
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(skill: StoredSkill) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/skills/${encodeURIComponent(skill.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !skill.enabled }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not update skill.");
      setMessage(`${skill.name} v${skill.version} ${skill.enabled ? "disabled" : "enabled"}.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update skill.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="skills-grid">
      <section className="info-card skill-upload-card">
        <p className="kicker">ADD A SKILL</p>
        <h2>Upload instructions.</h2>
        <p>Use a standalone <code>SKILL.md</code>, or a ZIP with <code>SKILL.md</code> and Markdown files under <code>references/</code>.</p>
        <form onSubmit={upload}>
          <label htmlFor="skill-bundle">Skill file</label>
          <input id="skill-bundle" name="bundle" type="file" accept=".md,.zip,application/zip,text/markdown" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          <Button type="submit" disabled={!file || busy}>{busy ? "Working…" : "Upload skill"}</Button>
        </form>
        <p className="skill-note">Uploads are private and disabled by default. Do not include credentials. Scripts, binary assets, and external tool permissions are not supported.</p>
        {message && <p className="feedback" role="status">{message}</p>}
      </section>
      <section className="skill-list">
        <div className="section-heading"><span>YOUR SKILLS</span><span>{skills.length} VERSION{skills.length === 1 ? "" : "S"}</span></div>
        {skills.length === 0 ? <div className="info-card skill-empty"><h2>No skills yet.</h2><p>Upload a resume-related skill to guide the current assistant. The hosted MVP skill can be uploaded to test the library, but it is not relevant to resume questions.</p></div> : skills.map((skill) => (
          <article className="info-card skill-item" key={skill.id}>
            <div className="skill-item-header">
              <div><p className="kicker">{skill.slug} / v{skill.version}</p><h2>{skill.name}</h2></div>
              <span className={`skill-state${skill.enabled ? " enabled" : ""}`}>{skill.enabled ? "ENABLED" : "DISABLED"}</span>
            </div>
            <p>{skill.description}</p>
            <p className="skill-note">{Object.keys(skill.files).length} Markdown file{Object.keys(skill.files).length === 1 ? "" : "s"} · Uploaded {new Date(skill.createdAt).toLocaleDateString()}</p>
            <div className="skill-actions">
              <details className="skill-export-panel">
                <summary>Review &amp; export</summary>
                <div className="skill-files">
                  <p className="skill-note">Exporting {skill.name} v{skill.version}. This is a copy of the stored source; it does not change which version is enabled.</p>
                  <ul>{Object.keys(skill.files).sort().map((path) => <li key={path}>{path}</li>)}</ul>
                  {Object.entries(skill.files).sort(([left], [right]) => left.localeCompare(right)).map(([path, content]) => <details key={path}><summary>{path}</summary><pre>{content}</pre></details>)}
                  <div className="skill-export-actions">
                    <button className="secondary-button" type="button" onClick={() => void copyManifest(skill)}>Copy SKILL.md</button>
                    <a className="secondary-button" href={`/api/skills/${encodeURIComponent(skill.id)}/export?format=md`}>Download SKILL.md</a>
                    <a className="secondary-button" href={`/api/skills/${encodeURIComponent(skill.id)}/export?format=zip`}>Export ZIP</a>
                  </div>
                  {copyStatus?.id === skill.id && <p className="skill-copy-status" role="status">{copyStatus.message}</p>}
                </div>
              </details>
              <Button type="button" variant={skill.enabled ? "outline" : "default"} disabled={busy} onClick={() => void toggle(skill)}>{skill.enabled ? "Disable" : "Enable for resume agent"}</Button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

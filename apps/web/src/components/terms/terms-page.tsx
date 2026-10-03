"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, ExternalLink, Search, Trash2 } from "lucide-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import type { SavedTerm } from "@/features/terms/store";

const eyebrow = "text-[11px] font-bold tracking-[0.15em] text-muted-foreground";

function saved(value: string) {
  return new Date(value).toLocaleDateString("en", { month: "short", day: "numeric" });
}

/** Every term looked up and saved anywhere in Ken OS, with where it was found. */
export function TermsPage({ email, terms, preview = false }: { email: string; terms: SavedTerm[]; preview?: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [removing, setRemoving] = useState("");
  const shown = terms.filter((term) => `${term.term} ${term.meaning}`.toLowerCase().includes(query.trim().toLowerCase()));

  async function remove(term: SavedTerm) {
    if (!window.confirm(`Remove "${term.term}" from Terms?`)) return;
    setRemoving(term.id);
    try {
      const response = await fetch(`/api/terms/${term.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(((await response.json().catch(() => ({}))) as { error?: string }).error ?? "Could not remove it.");
      toast({ tone: "success", title: `Removed "${term.term}" from Terms` });
      router.refresh();
    } catch (error) {
      toast({ tone: "error", title: "Could not remove it", description: error instanceof Error ? error.message : undefined });
    } finally {
      setRemoving("");
    }
  }

  return (
    <WorkspaceShell email={email} active="terms" preview={preview}>
      <div className="mx-auto min-h-[calc(100vh-88px)] w-full max-w-[1100px] border-x border-border px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <p className={eyebrow}>KEN OS · TERMS</p>
        <h1 className="mt-3 font-display text-4xl font-bold leading-[1.08] tracking-[-0.065em] sm:text-5xl">Words you looked up.</h1>
        <p className="mt-3 max-w-[620px] text-[15px] leading-6 text-muted-foreground">Select any word on a Ken OS page and press Explain, or E, to look it up without leaving the page. Saved terms land here with a link back to where you found them.</p>

        {terms.length > 0 && (
          <label className="mt-6 flex h-10 max-w-[420px] items-center gap-2 rounded-lg border border-input px-3 focus-within:ring-3 focus-within:ring-ring/50">
            <Search size={16} className="text-muted-foreground" aria-hidden="true" />
            <input className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Search your terms" aria-label="Search your terms" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
        )}

        {terms.length ? (
          <ul className="mt-6 divide-y divide-border border-y border-border">
            {shown.map((term) => (
              <li key={term.id} className="grid gap-2 py-5 md:grid-cols-[200px_minmax(0,1fr)_auto] md:gap-6">
                <p className="font-display text-lg font-semibold tracking-[-0.02em]">{term.term}</p>
                <div className="min-w-0">
                  <p className="text-[15px] leading-6">{term.meaning}</p>
                  <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <Link href={term.foundAt} className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline"><BookOpen size={14} aria-hidden="true" />{term.foundIn}</Link>
                    {term.source && <a className="inline-flex items-center gap-1.5 font-semibold underline-offset-4 hover:underline" href={term.source.url} target="_blank" rel="noopener noreferrer">{term.source.title}<ExternalLink size={12} aria-hidden="true" /></a>}
                    <span className="text-muted-foreground">Saved {saved(term.savedAt)}</span>
                  </p>
                </div>
                <Button type="button" variant="ghost" size="sm" className="justify-self-start" disabled={removing === term.id} onClick={() => void remove(term)} aria-label={`Remove ${term.term}`}><Trash2 aria-hidden="true" />Remove</Button>
              </li>
            ))}
            {!shown.length && <li className="py-5 text-sm text-muted-foreground">No saved term matches &ldquo;{query}&rdquo;.</li>}
          </ul>
        ) : (
          <div className="mt-8 max-w-[620px] rounded-xl border border-dashed border-input p-6 text-[15px] leading-6">
            <p className="font-semibold">No saved terms yet.</p>
            <p className="mt-1 text-muted-foreground">Try it on a lesson in the Engineering Lab: select a word like &ldquo;microtask&rdquo;, press Explain, then Save to Terms.</p>
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}

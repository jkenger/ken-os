"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, ExternalLink, Search, Trash2 } from "lucide-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import type { SavedTerm } from "@/features/terms/store";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";

function saved(value: string) {
  return new Date(value).toLocaleDateString("en", { month: "short", day: "numeric" });
}

/** Every term looked up and saved anywhere in Ken OS, with where it was found. */
export function TermsPage({ email, terms }: { email: string; terms: SavedTerm[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [removing, setRemoving] = useState("");
  const shown = terms.filter((term) => `${term.term} ${term.meaning}`.toLowerCase().includes(query.trim().toLowerCase()));

  async function remove(term: SavedTerm) {
    if (!window.confirm(`Remove "${term.term}" from Terms?`)) return;
    setRemoving(term.id);
    try {
      const response = await fetch(`/api/terms/${term.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(((await response.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn't remove. Try again");
      toast({ tone: "success", title: `Removed "${term.term}"` });
      router.refresh();
    } catch (error) {
      toast({ tone: "error", title: "Couldn't remove. Try again", description: error instanceof Error ? error.message : undefined });
    } finally {
      setRemoving("");
    }
  }

  return (
    <WorkspaceShell email={email} active="terms">
      <div className="mx-auto min-h-[calc(100vh-88px)] w-full max-w-[1100px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <h1 className="text-[30px] font-[750] leading-[1.1] tracking-[-0.035em] md:text-[34px] xl:text-[40px] xl:leading-[1.05]">Terms</h1>

        {terms.length > 0 && (
          <InputGroup className="mt-6 max-w-[420px] rounded-full">
            <InputGroupAddon><Search size={16} aria-hidden="true" /></InputGroupAddon>
            <InputGroupInput placeholder="Search terms" aria-label="Search terms" value={query} onChange={(event) => setQuery(event.target.value)} />
          </InputGroup>
        )}

        {terms.length ? (
          <ul className="mt-6 divide-y divide-border rounded-xl bg-card shadow-panel">
            {shown.map((term) => (
              <li key={term.id} className="grid gap-2 px-5 py-5 md:grid-cols-[200px_minmax(0,1fr)_auto] md:gap-6 md:px-6">
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
            {!shown.length && <li className="px-5 py-5 text-sm text-muted-foreground md:px-6">No matches for &ldquo;{query}&rdquo;</li>}
          </ul>
        ) : (
          <div className="mt-8 max-w-[620px] rounded-xl border border-dashed border-input p-6 text-[15px] leading-6">
            <p className="font-semibold">No terms yet</p>
            <p className="mt-1 text-muted-foreground">Select text on any page and press E</p>
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}

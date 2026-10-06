"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconExternalLink, IconX } from "@tabler/icons-react";
import { post } from "@/components/lab/topic/client";
import { radarTagWords } from "@/components/lab/words";
import { toast } from "@/components/ui/toaster";
import type { ProfileView } from "@/features/engineering-lab/profile-store";
import { engineering } from "@/features/engineering-lab/routes";
import { Badge, secondaryButton, textButton } from "./kit";
import { Dialog } from "./flow";

/** The weekly radar in a dialog, as the prototype opens it from Overview: scan, items with sources, dismiss. */
export function RadarDialog({ profile }: { profile: ProfileView }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  async function act(key: string, action: () => Promise<unknown>, success?: string) {
    setBusy(key);
    try { await action(); if (success) toast({ tone: "success", title: success }); router.refresh(); }
    catch (error) { toast({ tone: "error", title: "Couldn't update the radar. Try again", description: error instanceof Error ? error.message : undefined }); }
    finally { setBusy(""); }
  }
  const { radar } = profile;
  return (
    <Dialog title="Radar" trigger="View radar">
      {!profile.direction ? (
        <div className="py-6 text-center"><h3 className="!mt-0">No direction yet</h3><p>The radar scans for your direction</p><Link href={engineering.direction()} className={`${secondaryButton} mt-4`}>Choose direction</Link></div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={secondaryButton} disabled={radar.checked || Boolean(busy)} onClick={() => void act("scan", () => post("/api/lab/radar"), "Radar updated")}>
              {busy === "scan" ? "Scanning…" : radar.checked ? `Scanned · ${radar.week}` : "Scan now"}
            </button>
            <span className="text-xs">Official docs, release notes and changelogs · up to 5 a week · never graded</span>
          </div>
          {radar.items.length ? (
            <ul className="mt-4 divide-y divide-border border-y border-border">
              {radar.items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-semibold text-foreground"><Badge>{radarTagWords[item.tag]}</Badge>{item.title}</p>
                    <p className="mt-1">{item.reason}</p>
                    {item.topicId ? <Link href={engineering.topic(item.topicId, "check")} className={textButton}>Re-check</Link>
                      : item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer" className={textButton}>Source<IconExternalLink size={14} aria-hidden="true" /></a>}
                  </div>
                  <button type="button" aria-label={`Dismiss ${item.title}`} className="rounded-md p-1 hover:bg-muted" disabled={Boolean(busy)} onClick={() => void act(item.id, () => post("/api/lab/profile", { action: "dismissRadar", id: item.id }))}><IconX size={16} aria-hidden="true" /></button>
                </li>
              ))}
            </ul>
          ) : <div className="py-6 text-center"><h3 className="!mt-0">No verified radar items yet</h3><p>Up to five changes a week from official sources, each tied to your direction</p></div>}
        </>
      )}
    </Dialog>
  );
}

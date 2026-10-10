"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconExternalLink, IconX } from "@tabler/icons-react";
import { post, send } from "@/components/lab/topic/client";
import { radarTagWords } from "@/components/lab/words";
import { toast } from "@/components/ui/toaster";
import type { RadarView } from "@/features/engineering-lab/radar-store";
import { engineering } from "@/features/engineering-lab/routes";
import { Badge } from "./kit";
import { Dialog } from "./flow";
import { Button } from "@/components/ui/button";

/** The weekly radar in a dialog, as the prototype opens it from Overview: scan, items with sources, dismiss. */
export function RadarDialog({ radar }: { radar: RadarView }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  async function act(key: string, action: () => Promise<unknown>, success?: string) {
    setBusy(key);
    try { await action(); if (success) toast({ tone: "success", title: success }); router.refresh(); }
    catch (error) { toast({ tone: "error", title: "Couldn't update the radar. Try again", description: error instanceof Error ? error.message : undefined }); }
    finally { setBusy(""); }
  }
  return (
    <Dialog title="Radar" trigger="View radar">
      {!radar.direction ? (
        <div className="py-6 text-center"><h3 className="!mt-0">No direction yet</h3><p>The radar scans for your direction</p><Button asChild variant="outline" className="mt-4"><Link href={engineering.direction}>Choose direction</Link></Button></div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" type="button" disabled={radar.checked || Boolean(busy)} onClick={() => void act("scan", () => post("/api/lab/radar"), "Radar updated")}>
              {busy === "scan" ? "Scanning…" : radar.checked ? `Scanned · ${radar.week}` : "Scan now"}
            </Button>
            <span className="text-xs">Official docs, release notes and changelogs · up to 5 a week · never graded</span>
          </div>
          {radar.items.length ? (
            <ul className="mt-4 divide-y divide-border border-y border-border">
              {radar.items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-semibold text-foreground"><Badge>{radarTagWords[item.tag]}</Badge>{item.title}</p>
                    <p className="mt-1">{item.reason}</p>
                    {item.topicId ? <Button asChild variant="text"><Link href={engineering.topic(item.topicId)}>Re-check</Link></Button>
                      : item.sourceUrl && <Button asChild variant="text"><a href={item.sourceUrl} target="_blank" rel="noreferrer">Source<IconExternalLink size={14} aria-hidden="true" /></a></Button>}
                  </div>
                  <Button variant="ghost" size="icon-sm" type="button" aria-label={`Dismiss ${item.title}`} disabled={Boolean(busy)} onClick={() => void act(item.id, () => send("/api/lab/radar", "DELETE", { id: item.id }))}><IconX size={16} aria-hidden="true" /></Button>
                </li>
              ))}
            </ul>
          ) : <div className="py-6 text-center"><h3 className="!mt-0">No verified radar items yet</h3><p>Up to five changes a week from official sources, each tied to your direction</p></div>}
        </>
      )}
    </Dialog>
  );
}

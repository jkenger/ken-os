"use client";

import Link from "next/link";
import { IconExternalLink } from "@tabler/icons-react";
import type { Mode, PacketSource } from "@ken-os/domain";
import { formatDate, kindWords, labelWords, modeWords, toneFor } from "@/components/lab/words";
import { Pill } from "@/components/ui/pill";
import { engineering } from "@/features/engineering-lab/routes";
import { Dialog } from "./flow";

/** The prototype's "Evidence & sources" dialog for a topic: what proof needs, the answers so far, the lesson's sources. */
export function TopicEvidenceDialog({ prove, sources, attempts }: {
  prove: Mode[];
  sources: PacketSource[];
  attempts: { id: string; kind: string; mode: string; label: string; voided: boolean; createdAt: string }[];
}) {
  return (
    <Dialog title="Evidence & sources" trigger="Evidence & sources">
      <h3 className="!mt-0">What you will prove</h3>
      <ul className="list-disc pl-5 leading-[1.9]">
        {prove.map((mode) => <li key={mode}>{modeWords[mode] ?? mode}, solid</li>)}
        <li>At least one checked by running code</li>
      </ul>
      <h3>Answers so far</h3>
      {attempts.length ? (
        <ul className="divide-y divide-border border-y border-border">
          {attempts.map((attempt) => (
            <li key={attempt.id}>
              <Link href={engineering.evidence(attempt.id)} className="flex items-center justify-between gap-3 py-2.5 hover:text-foreground">
                <span>{kindWords[attempt.kind] ?? attempt.kind} · {modeWords[attempt.mode] ?? attempt.mode} · {formatDate(attempt.createdAt)}</span>
                <Pill tone={toneFor(attempt.voided ? "voided" : attempt.label)}>{attempt.voided ? "Discarded" : labelWords[attempt.label as keyof typeof labelWords] ?? attempt.label}</Pill>
              </Link>
            </li>
          ))}
        </ul>
      ) : <p>None yet. Opening a lesson never proves a topic</p>}
      <h3>Sources</h3>
      {sources.length ? (
        <ul className="space-y-2">
          {sources.map((source) => (
            <li key={source.url}>
              <a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-semibold text-foreground underline decoration-input underline-offset-4 hover:decoration-foreground">{source.title}<IconExternalLink size={14} aria-hidden="true" /></a>
              <p className="text-xs">{source.whyItMatters}</p>
            </li>
          ))}
        </ul>
      ) : <p>Written with the lesson, from the trusted sites only</p>}
    </Dialog>
  );
}

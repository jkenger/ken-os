import { Check, Minus, Plus, Sparkles } from "lucide-react";
import { diffLines, type RubricResult } from "@ken-os/domain";
import { Pill, type PillTone } from "@/components/ui/pill";
import { cn } from "@/lib/utils";
import { formatDate } from "../words";

const diffWords = {
  missing: { moved: "Actually prints here", alone: "Missing from yours" },
  extra: { moved: "You had it here", alone: "Never printed" },
};

/** The real output against yours, line by line, so the exact mistake is visible at a glance. */
export function PredictionDiff({ actual, predicted }: { actual: string[]; predicted: string[] }) {
  const rows = diffLines(actual, predicted);
  const moved = rows.filter((row) => row.kind === "missing" && row.moved).length;
  const missing = rows.filter((row) => row.kind === "missing" && !row.moved).length;
  const extra = rows.filter((row) => row.kind === "extra" && !row.moved).length;
  const summary = [moved && `${moved} in the wrong place`, missing && `${missing} missing`, extra && `${extra} that never printed`].filter(Boolean).join(", ");
  return (
    <div className="mt-4">
      <p className="text-sm font-semibold">Actual vs. predicted</p>
      <ol className="mt-2 overflow-hidden rounded-lg bg-muted font-mono text-sm leading-6">
        {rows.map((row, index) => (
          <li key={index} className={cn("flex items-center gap-3 px-3", row.kind === "missing" && "bg-destructive/10", row.kind === "extra" && "bg-muted")}>
            <span className="w-4 shrink-0" aria-hidden="true">{row.kind === "match" ? <Check size={13} className="text-foreground" /> : row.kind === "missing" ? <Minus size={13} /> : <Plus size={13} />}</span>
            <span className="min-w-0 flex-1 break-words">{row.text}</span>
            {row.kind !== "match" && <span className="shrink-0 font-sans text-xs font-semibold">{diffWords[row.kind][row.moved ? "moved" : "alone"]}</span>}
          </li>
        ))}
        {!rows.length && <li className="px-3 font-sans text-sm">No output, as predicted</li>}
      </ol>
      <p className="mt-2 text-sm text-muted-foreground">{summary ? `Lines: ${summary}` : "All lines, in order"}</p>
    </div>
  );
}

const rubricLook: Record<RubricResult["result"], { tone: PillTone; text: string }> = {
  covered: { tone: "solid", text: "Covered" },
  partly: { tone: "partial", text: "Partly" },
  missed: { tone: "gap", text: "Missed" },
};

/** Each point the grader looked for and how the answer did on it. Hidden until the answer is in, so it gives nothing away. */
export function RubricChecklist({ items }: { items: RubricResult[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-4">
      <p className="text-sm font-semibold">What the grader looked for</p>
      <ul className="mt-2 divide-y divide-border rounded-lg bg-muted text-sm">
        {items.map((item) => (
          <li key={item.point} className="flex items-start justify-between gap-3 px-3 py-2.5">
            <span className="leading-5">{item.point}</span>
            <Pill tone={rubricLook[item.result].tone}>{rubricLook[item.result].text}</Pill>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The one celebration in the module: a topic just turned proven. */
export function ProvenBanner({ title, nextReviewAt, byCode }: { title: string; nextReviewAt: string | null; byCode: number }) {
  return (
    <div className="rounded-xl bg-muted p-6" role="status">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-foreground"><Sparkles size={15} aria-hidden="true" />Topic proven</p>
      <p className="mt-2 font-heading text-2xl font-semibold tracking-tight">{title}</p>
      <p className="mt-1 text-sm">
        All parts shown{byCode ? ` · ${byCode} by code` : ""}{nextReviewAt ? ` · first review ${formatDate(nextReviewAt)}` : ""}
      </p>
    </div>
  );
}

import type { RubricResult } from "@ken-os/domain";
import { Pill, type PillTone } from "@/components/ui/pill";

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

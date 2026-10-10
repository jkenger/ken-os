"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { requirementsUpTo, WEEKLY_HOURS, type Careers, type TopicMap } from "@ken-os/domain";
import { WorkspaceShell } from "@/components/workspace-shell";
import { send } from "@/components/lab/topic/client";
import { depthWords } from "@/components/lab/words";
import { toast } from "@/components/ui/toaster";
import { engineering } from "@/features/engineering-lab/routes";
import { cn } from "@/lib/utils";
import { Back, Notice, PageHeading, panel } from "./kit";
import { Dialog, field, fieldLabel, FlowLayout, FlowNotes } from "./flow";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

// Direction: target role and hours per week. Spec: docs/architecture/engineering-rebuild.md, section 3 (Direction).
// Saving recomputes the path; it never changes evidence.

function LevelsDialog({ careers }: { careers: Careers }) {
  return (
    <Dialog title="Levels and depth" trigger="Levels and depth">
      {careers.levels.map((level) => (
        <div key={level.id}>
          <h3>{level.title}</h3>
          <p>{level.summary}</p>
        </div>
      ))}
      <h3>Depth</h3>
      <ul className="list-disc pl-5 leading-relaxed">
        <li><strong className="text-foreground">{depthWords.aware}</strong>: one topic of the chapter proven</li>
        <li><strong className="text-foreground">{depthWords.build}</strong>: every core topic proven</li>
        <li><strong className="text-foreground">{depthWords.run}</strong>: every topic proven, the deep ones too</li>
      </ul>
      <p className="mt-4">Overall level is capped by the weakest required area</p>
    </Dialog>
  );
}

export function Direction({ email, careers, map, direction, weeklyHours }: { email: string; careers: Careers; map: TopicMap; direction: string | null; weeklyHours: number | null }) {
  const router = useRouter();
  const [role, setRole] = useState(direction ?? careers.roles[0].id);
  const [hours, setHours] = useState<number>(weeklyHours ?? 5);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const chosen = careers.roles.find((item) => item.id === role)!;
  const valid = Number.isInteger(hours) && hours >= WEEKLY_HOURS.min && hours <= WEEKLY_HOURS.max;

  async function save() {
    setBusy(true); setProblem("");
    try {
      await send("/api/lab/direction", "PUT", { role, weeklyHours: hours });
      toast({ tone: "success", title: "Direction saved" });
      router.push(engineering.profile);
      router.refresh();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Couldn't save. Try again");
      setBusy(false);
    }
  }

  return (
    <WorkspaceShell email={email} active="lab" tab="profile">
      <div className="mx-auto max-w-7xl px-3 pb-9 pt-6 md:px-5 md:pt-7.5">
        <Back href={engineering.profile}>Profile</Back>
        <PageHeading title="Direction" />
        <FlowLayout>
          <section className={cn(panel, "p-6 md:p-7.5")}>
            <Label className={cn(fieldLabel, "mb-2")}>
              Target role
              <NativeSelect className="mt-2.5 w-full" value={role} onChange={(event) => setRole(event.target.value)}>
                {careers.roles.map((item) => <NativeSelectOption key={item.id} value={item.id}>{item.title}</NativeSelectOption>)}
              </NativeSelect>
            </Label>
            <p className="mb-6.5 text-xs text-muted-foreground">{chosen.summary}</p>

            <h3 className="text-xs font-semibold">Required depth</h3>
            <ul className="mb-6.5 mt-2.5">
              {careers.areas.filter((area) => chosen.targets[area.id]).map((area) => {
                const level = chosen.targets[area.id]!;
                return (
                  <li key={area.id} className="border-t border-border py-3 text-xs">
                    <p className="font-semibold">{area.title} <span className="font-normal text-muted-foreground">· {careers.levels.find((item) => item.id === level)?.title}</span></p>
                    <ul className="mt-1.5 text-muted-foreground">
                      {requirementsUpTo(area, level).map(({ chapter, depth }) => (
                        <li key={chapter} className="flex justify-between gap-4"><span>{map.chapters.find((item) => item.id === chapter)?.title ?? chapter}</span><span>{depthWords[depth]}</span></li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>

            <Label className={cn(fieldLabel, "mb-6.5")}>
              Hours per week
              <Input type="number" min={WEEKLY_HOURS.min} max={WEEKLY_HOURS.max} className={cn(field, "mt-2.5 max-w-[160px] py-0")} value={Number.isNaN(hours) ? "" : hours}
                onChange={(event) => setHours(event.target.value === "" ? Number.NaN : Number(event.target.value))} />
            </Label>
            {problem && <Notice tone="error">{problem}</Notice>}
            <Button type="button" disabled={busy || !valid} onClick={() => void save()}>{busy ? "Saving…" : "Save direction"}</Button>
          </section>
          <FlowNotes title="Levels">
            <p className="mt-2">Saving never changes evidence</p>
            <div className="mt-3"><LevelsDialog careers={careers} /></div>
          </FlowNotes>
        </FlowLayout>
      </div>
    </WorkspaceShell>
  );
}

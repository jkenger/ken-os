import { Check } from "lucide-react";
import { depthAtLeast, LEVELS, levelRank, type Level } from "@ken-os/domain";
import { careers, topicMap } from "@/features/engineering-lab/curriculum";
import type { ProfileView } from "@/features/engineering-lab/profile-store";
import { cn } from "@/lib/utils";
import { depthWords, levelWords } from "../words";

// What each level needs, per area: every chapter at its depth, ticked once you're deep enough.
// The detail behind the skyline; chosen for the profile page on 2026-10-03.

function chapterTitle(id: string, profile: ProfileView) {
  return topicMap.modules.find((module) => module.id === id)?.title ?? profile.addedChapters.find((chapter) => chapter.id === id)?.title ?? id;
}

export function LevelTable({ profile, targets }: { profile: ProfileView; targets: Partial<Record<string, Level>> }) {
  const state = (chapter: string) => profile.chapterStates.find((item) => item.chapterId === chapter);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] border-collapse text-left text-sm">
        <caption className="mb-3 text-left text-sm text-muted-foreground">
          Tick: deep enough · Shaded: reached{Object.keys(targets).length ? " · Outlined: direction target" : ""}
        </caption>
        <thead>
          <tr className="border-b border-foreground">
            <th scope="col" className="w-[160px] py-2 pr-4 font-semibold">Area</th>
            {LEVELS.map((level) => <th key={level} scope="col" className="py-2 pr-4 font-semibold">{levelWords(level)}</th>)}
          </tr>
        </thead>
        <tbody>
          {careers.areas.map((ladder) => {
            const area = profile.areas.find((item) => item.area === ladder.id)!;
            return (
              <tr key={ladder.id} className="border-b border-border align-top">
                <th scope="row" className="py-3 pr-4 font-normal">
                  <span className="block font-semibold">{ladder.title}</span>
                  <span className="text-muted-foreground">{levelWords(area.now.level)}{area.now.estimate ? ", estimate" : ""}</span>
                </th>
                {LEVELS.map((level) => (
                  <td key={level} className="py-2 pr-2">
                    <div className={cn("rounded-md p-2", levelRank(area.now.level) >= levelRank(level) && "bg-status-solid-surface", targets[ladder.id] === level && "outline-2 outline-foreground")}>
                      <ul className="space-y-1">
                        {ladder.levels[level].map((requirement) => {
                          const met = depthAtLeast(state(requirement.chapter)?.depth ?? "none", requirement.depth);
                          return (
                            <li key={requirement.chapter} className="flex items-start gap-1.5">
                              {met
                                ? <Check size={14} className="mt-0.5 shrink-0 text-status-solid" aria-label="Done" />
                                : <span className="mt-1.5 size-2 shrink-0 rounded-full border border-muted-foreground" role="img" aria-label="Not yet" />}
                              <span>{chapterTitle(requirement.chapter, profile)} <span className="text-muted-foreground">({depthWords[requirement.depth].toLowerCase()})</span></span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

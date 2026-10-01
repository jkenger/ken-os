import Link from "next/link";
import type { TopicProgress } from "@ken-os/domain";
import { WorkspaceShell } from "@/components/workspace-shell";
import { findTopic, labsForTopic, topicMap } from "@/features/engineering-lab/curriculum";
import { LabHeader, StatusTag } from "./lab-today";
import { label, labelWords, statusWords } from "./words";

export function LabTopics({ email, progress }: { email: string; progress: TopicProgress[] }) {
  const byId = new Map(progress.map((item) => [item.topicId, item]));
  return (
    <WorkspaceShell email={email} active="lab">
      <div className="mx-auto min-h-[calc(100vh-88px)] w-full max-w-[1320px] border-x border-border">
        <LabHeader eyebrow="ENGINEERING LAB · TOPICS" title="The topic map." intro="Each topic lists what it builds on. A topic opens up once everything it builds on is proven." />
        {topicMap.modules.map((module, moduleIndex) => (
          <section key={module.id} className="border-b border-border px-5 py-7 sm:px-8 lg:px-10" aria-labelledby={`${module.id}-title`}>
            <p className={label}>MODULE {moduleIndex + 1} · {module.track.toUpperCase()}</p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.05em]" id={`${module.id}-title`}>{module.title}</h2>
            <ol className="mt-4 divide-y divide-border border-y border-border">
              {topicMap.topics.filter((topic) => topic.module === module.id).map((topic) => {
                const item = byId.get(topic.id)!;
                const locked = item.status === "NOT_STARTED" && topic.requires.some((id) => byId.get(id)?.status !== "VALIDATED");
                return (
                  <li key={topic.id}>
                    <Link href={`/lab/topics/${topic.id}`} className="flex flex-col gap-3 py-4 hover:bg-muted/50 sm:flex-row sm:items-start sm:justify-between sm:px-2">
                      <div className="min-w-0">
                        <p className="font-semibold">{topic.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {topic.requires.length ? `Builds on ${topic.requires.map((id) => findTopic(id)?.title).join(", ")}` : "No prerequisites"}
                          {" · "}Prove by: {topic.prove.join(", ")}
                          {labsForTopic(topic.id).length ? ` · ${labsForTopic(topic.id).length} lab` : ""}
                        </p>
                        {item.baselineLabel && <p className="mt-1 text-sm text-muted-foreground">Baseline: {labelWords[item.baselineLabel]}</p>}
                      </div>
                      <StatusTag value={item.status}>{locked ? "Waiting on prerequisites" : statusWords[item.status]}</StatusTag>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </WorkspaceShell>
  );
}

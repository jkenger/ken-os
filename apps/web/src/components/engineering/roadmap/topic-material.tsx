"use client";

import {
  IconArticle,
  IconBarbell,
  IconChevronRight,
  IconClock,
  IconCode,
  IconExternalLink,
  IconFileText,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TopicPanelView } from "@/features/engineering-lab/roadmap-store";
import { planTopicMessage } from "@/features/engineering-lab/ask-claude";
import { difficultyWords, formatMinutes, type ResourceKind } from "@/features/engineering-lab/topic-material";
import { AskClaude } from "../ask-claude";
import { StatusIcon, statusWords } from "./status";

// Claude's material in the topic panel (docs/architecture/roadmap-ui.md): the estimate and difficulty, prerequisites
// and related topics (Overview), learning resources, and Not planned yet before Claude writes any (Detail). Each part
// shows only when Claude saved it; nothing here is made up on screen.

const sectionTitle = "mb-1.5 text-xs font-semibold text-muted-foreground";

/** "~25 min · Easy", under the title. */
export function TopicFacts({ plan }: { plan: TopicPanelView["plan"] }) {
  if (!plan || (!plan.minutes && !plan.difficulty)) return null;
  return (
    <p className="flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-muted-foreground">
      {plan.minutes && (
        <span className="inline-flex items-center gap-1.5">
          <IconClock aria-hidden="true" className="size-3.5" />
          {formatMinutes(plan.minutes)}
        </span>
      )}
      {plan.difficulty && (
        <span className="inline-flex items-center gap-1.5">
          <IconBarbell aria-hidden="true" className="size-3.5" />
          {difficultyWords[plan.difficulty]}
        </span>
      )}
    </p>
  );
}

function TopicLink({
  topic,
  detail,
  onSelect,
}: {
  topic: { id: string; title: string; status: TopicPanelView["status"]["status"] };
  detail?: string;
  onSelect: (topicId: string) => void;
}) {
  return (
    <li>
      <Button
        type="button"
        variant="ghost"
        onClick={() => onSelect(topic.id)}
        aria-label={`${topic.title}, ${statusWords[topic.status]}`}
        className="h-auto min-h-10 w-full justify-start gap-2.5 px-2 py-1.5 text-left font-normal whitespace-normal"
      >
        <StatusIcon status={topic.status} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm">{topic.title}</span>
          {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
        </span>
        <IconChevronRight aria-hidden="true" className="text-muted-foreground" />
      </Button>
    </li>
  );
}

/** Prerequisites with their status and "Waiting on" (advice, not a lock), then related topics. */
export function TopicLinks({ plan, onSelect }: { plan: TopicPanelView["plan"]; onSelect: (topicId: string) => void }) {
  if (!plan) return null;
  const waiting = plan.prerequisites.filter((topic) => plan.waitingOn.includes(topic.id));
  return (
    <>
      {plan.prerequisites.length > 0 && (
        <section aria-labelledby="prerequisites-title">
          <div className="flex items-center gap-2">
            <h3 id="prerequisites-title" className={sectionTitle}>
              Prerequisites
            </h3>
            {waiting.length > 0 && (
              <Badge variant="outline" className="mb-1.5">
                Waiting on {waiting.length}
              </Badge>
            )}
          </div>
          <ul className="-mx-2 grid">
            {plan.prerequisites.map((topic) => (
              <TopicLink key={topic.id} topic={topic} detail={statusWords[topic.status]} onSelect={onSelect} />
            ))}
          </ul>
        </section>
      )}
      {plan.related.length > 0 && (
        <section aria-labelledby="related-title">
          <h3 id="related-title" className={sectionTitle}>
            Related objectives
          </h3>
          <ul className="-mx-2 grid">
            {plan.related.map((topic) => (
              <TopicLink key={topic.id} topic={topic} detail={topic.chapter} onSelect={onSelect} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

const kindIcons: Record<ResourceKind, typeof IconFileText> = {
  docs: IconFileText,
  video: IconPlayerPlay,
  repo: IconCode,
  article: IconArticle,
};
const kindWords: Record<ResourceKind, string> = { docs: "Docs", video: "Video", repo: "Repo", article: "Article" };

export function TopicResources({ material }: { material: TopicPanelView["material"] }) {
  if (!material?.resources.length) return null;
  return (
    <section aria-labelledby="resources-title" className="grid gap-1">
      <h3 id="resources-title" className="text-sm font-semibold">
        Learning resources
      </h3>
      <ul className="-mx-2 grid">
        {material.resources.map((resource) => {
          const Icon = kindIcons[resource.kind];
          return (
            <li key={resource.url}>
              <Button
                asChild
                variant="ghost"
                className="h-auto min-h-10 w-full justify-start gap-2.5 px-2 py-1.5 font-normal whitespace-normal"
              >
                <a href={resource.url} target="_blank" rel="noopener noreferrer">
                  <Icon aria-hidden="true" className="text-muted-foreground" />
                  <span className="min-w-0 flex-1 text-sm">{resource.title}</span>
                  <span className="text-xs text-muted-foreground">{kindWords[resource.kind]}</span>
                  <IconExternalLink aria-hidden="true" className="text-muted-foreground" />
                </a>
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Before Claude writes the topic's material: say so, and offer the one step that fills it. */
export function NotPlanned({ panel, projectUrl }: { panel: TopicPanelView; projectUrl: string | null }) {
  if (panel.material) return null;
  return (
    <section aria-labelledby="not-planned-title" className="grid gap-2 rounded-xl border border-dashed p-3">
      <div>
        <h3 id="not-planned-title" className="text-sm font-semibold">
          Not planned yet
        </h3>
        <p className="text-xs text-muted-foreground">Claude writes resources, tasks and criteria for this topic</p>
      </div>
      {projectUrl && (
        <div>
          <AskClaude message={planTopicMessage(panel)} label="Ask Claude to plan it" projectUrl={projectUrl} />
        </div>
      )}
    </section>
  );
}

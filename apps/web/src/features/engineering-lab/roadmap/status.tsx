import { IconCircleCheckFilled, IconCircleDashed, IconCircleHalf2, IconPlayerSkipForward } from "@tabler/icons-react";
import type { TopicStatus } from "@ken-os/domain";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// How a topic's status reads on the roadmap (docs/architecture/engineering-claude-first.md, section 2, and
// docs/architecture/roadmap-ui.md). The word and the icon shape carry the meaning; colour only reinforces it: a filled
// check for Learned, a half circle for In progress, a dashed ring for Not started, a skip arrow for Skipped.

export const statusWords: Record<TopicStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  learned: "Learned",
  skipped: "Skipped",
};

const icons = {
  not_started: IconCircleDashed,
  in_progress: IconCircleHalf2,
  learned: IconCircleCheckFilled,
  skipped: IconPlayerSkipForward,
} as const;

/** Text colour for a status: its own colour for Learned and In progress, quiet for the rest. */
export const statusTone: Record<TopicStatus, string> = {
  not_started: "text-muted-foreground",
  in_progress: "text-topic-active",
  learned: "text-topic-learned",
  skipped: "text-muted-foreground",
};

/** The soft chip behind a status word. */
const chipTone: Record<TopicStatus, string> = {
  not_started: "bg-muted text-foreground",
  in_progress: "bg-topic-active-soft text-topic-active",
  learned: "bg-topic-learned-soft text-topic-learned",
  skipped: "bg-muted text-muted-foreground",
};

export function StatusIcon({
  status,
  size = 16,
  className,
}: {
  status: TopicStatus;
  size?: number;
  className?: string;
}) {
  const Icon = icons[status];
  return <Icon size={size} aria-hidden="true" className={cn("shrink-0", statusTone[status], className)} />;
}

export function StatusLabel({ status }: { status: TopicStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <StatusIcon status={status} size={14} />
      {statusWords[status]}
    </span>
  );
}

/** The status as a chip, for a topic's heading. */
export function StatusChip({ status }: { status: TopicStatus }) {
  return (
    <Badge variant="secondary" className={cn("gap-1", chipTone[status])}>
      <StatusIcon status={status} className="text-current" />
      {statusWords[status]}
    </Badge>
  );
}

const legend: TopicStatus[] = ["learned", "in_progress", "not_started", "skipped"];

/** Every status as a row of pills, beside the roadmap view switch. */
export function StatusLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {legend.map((status) => (
        <Badge key={status} variant="outline" className="h-6 gap-1.5 bg-card pr-2.5 pl-1.5 font-normal">
          <StatusIcon status={status} size={14} />
          {statusWords[status]}
        </Badge>
      ))}
    </div>
  );
}

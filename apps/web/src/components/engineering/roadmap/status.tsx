import { IconCircleCheck, IconCircleDashed, IconPlayerSkipForward, IconProgress } from "@tabler/icons-react";
import type { TopicStatus } from "@ken-os/domain";
import { cn } from "@/lib/utils";

// How a topic's status reads on the roadmap (docs/architecture/engineering-claude-first.md, section 2). The word and the
// icon carry the meaning; colour only reinforces it.

export const statusWords: Record<TopicStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  learned: "Learned",
  skipped: "Skipped",
};

const icons = {
  not_started: IconCircleDashed,
  in_progress: IconProgress,
  learned: IconCircleCheck,
  skipped: IconPlayerSkipForward,
} as const;

/** Text colour for a status: strong for Learned and In progress, quiet for the rest. */
export const statusTone: Record<TopicStatus, string> = {
  not_started: "text-muted-foreground",
  in_progress: "text-primary",
  learned: "text-primary",
  skipped: "text-muted-foreground",
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

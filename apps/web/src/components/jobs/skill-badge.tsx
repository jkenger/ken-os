import { CheckCircle2, CircleDot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { SkillMatch } from "@/features/jobs/skills-match";
import { cn } from "@/lib/utils";

// Shared with the job detail page's own Skills section (docs/mockups/Jobs redesign.html, "Desktop / Job detail")
// and the New list's cards -- one skill-match badge style everywhere a posting's skills are shown against the
// Profile, so a skill reads the same way card to card and on the detail page.

export function SkillBadge({ match }: { match: SkillMatch }) {
  const badge = (
    <Badge
      variant={match.status === "missing" ? "secondary" : "outline"}
      className={cn(
        "gap-1",
        match.status === "have" &&
          "border-green-200 bg-green-100 text-green-800 dark:border-green-500/30 dark:bg-green-500/15 dark:text-green-300",
        match.status === "related" &&
          "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300",
      )}
    >
      {match.status === "have" && <CheckCircle2 className="size-3" />}
      {match.status === "related" && <CircleDot className="size-3" />}
      {match.skill}
    </Badge>
  );

  if (match.status !== "related") return badge;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent>Close to {match.relatedTo.join(", ")} in your Profile</TooltipContent>
    </Tooltip>
  );
}

export function SkillGroup({ label, matches }: { label: string; matches: SkillMatch[] }) {
  if (matches.length === 0) return null;
  return (
    <div className="grid gap-1.5">
      <span className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
        {label} ({matches.length})
      </span>
      <div className="flex flex-wrap gap-1.5">
        {matches.map((match) => (
          <SkillBadge key={match.skill} match={match} />
        ))}
      </div>
    </div>
  );
}

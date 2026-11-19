"use client";

import { ArrowUpRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Tailored CV's ready-state controls (docs/architecture/job-card-actions.md, "Two new modals"): extracted out of
// `posting-detail.tsx`'s title row so the detail page and the New-list card's own Tailored CV modal
// (`new-list.tsx`) render the exact same markup instead of duplicating it. Assumes an ancestor already defines
// the `rainbowGradient` SVG gradient the icons stroke with (posting-detail.tsx's title row, or new-list.tsx's
// shared def for every card on the page) -- this component doesn't define its own, to avoid a duplicate `id`
// when more than one of these render in the same document.

/** The same `ButtonGroup` both the detail page's title row and a card's Tailored CV modal render once
 *  `tailorStatus` is "ready": open the stored PDF in a new tab, or regenerate it in place. */
export function TailoredCvActions({
  postingId,
  onRegenerateClick,
}: {
  postingId: string;
  onRegenerateClick: () => void;
}) {
  return (
    <ButtonGroup aria-label="Tailored CV">
      <Button
        type="button"
        variant="outline"
        className="group/tailor rounded-r-none border-r-0 border-transparent"
        asChild
      >
        <a href={`/api/jobs/postings/${postingId}/tailor`} target="_blank" rel="noopener noreferrer">
          View tailored CV
          <ArrowUpRight
            color="url(#rainbowGradient)"
            className="transition-transform duration-200 ease-out group-hover/tailor:translate-x-0.5 group-hover/tailor:-translate-y-0.5"
          />
        </a>
      </Button>
      <ButtonGroupSeparator />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-l-none border-transparent"
            aria-label="Regenerate tailored CV"
            onClick={onRegenerateClick}
          >
            <RefreshCw color="url(#rainbowGradient)" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Regenerate</TooltipContent>
      </Tooltip>
    </ButtonGroup>
  );
}

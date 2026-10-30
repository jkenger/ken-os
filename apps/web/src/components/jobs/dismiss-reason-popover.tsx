"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const REASONS = ["Not interested", "Wrong seniority", "Already applied elsewhere", "Other"] as const;

/** Dismiss asks for a reason before it moves a posting to Dismissed (docs/product/job-finder.md). */
export function DismissReasonPopover({
  trigger,
  onDismiss,
}: {
  trigger: ReactNode;
  onDismiss: (reason: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number] | null>(null);
  const [otherText, setOtherText] = useState("");

  const canConfirm = reason !== null && (reason !== "Other" || otherText.trim().length > 0);

  const reset = () => {
    setReason(null);
    setOtherText("");
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-80 gap-3">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Reason</span>
        <div className="flex flex-col gap-1">
          {REASONS.map((option) => (
            <Button
              key={option}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setReason(option)}
              className={cn(
                "h-auto justify-start px-2.5 py-1.5 font-normal",
                reason === option && "bg-muted text-foreground",
              )}
            >
              {option}
            </Button>
          ))}
        </div>
        {reason === "Other" && (
          <Textarea
            autoFocus
            placeholder="Say why"
            value={otherText}
            onChange={(event) => setOtherText(event.target.value)}
            className="min-h-20"
          />
        )}
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={!canConfirm}
            onClick={() => {
              onDismiss(reason === "Other" ? `Other: ${otherText.trim()}` : (reason as string));
              setOpen(false);
            }}
          >
            Confirm
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

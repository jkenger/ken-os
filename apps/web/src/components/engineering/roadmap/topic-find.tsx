"use client";

import { useEffect, useState } from "react";
import { IconSearch } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { RoadmapView } from "@/features/engineering-lab/roadmap-store";
import { StatusIcon, statusWords } from "./status";

// Find a topic on this roadmap by title and open it (docs/architecture/roadmap-ui.md). Press / to open it from anywhere
// on the page; Ctrl or Cmd + K stays with the module search.

/** True when a key press is typing into a field, so / should type a slash. */
function typing(target: EventTarget | null) {
  return (
    target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
  );
}

export function TopicFind({ view, onSelect }: { view: RoadmapView; onSelect: (topicId: string) => void }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey || typing(event.target)) return;
      event.preventDefault();
      setOpen(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="w-full justify-start gap-2 rounded-lg bg-card font-normal text-muted-foreground sm:w-56"
      >
        <IconSearch aria-hidden="true" />
        Find a topic
        <kbd className="ml-auto rounded border px-1.5 font-mono text-[0.6875rem] leading-4">/</kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Find a topic" description="Topics on this roadmap">
        <Command>
          <CommandInput placeholder="Topic or chapter" />
          <CommandList>
            <CommandEmpty>No topics match</CommandEmpty>
            {view.chapters.map((chapter) => (
              <CommandGroup key={chapter.id} heading={chapter.title}>
                {chapter.topics.map((topic) => (
                  <CommandItem
                    key={topic.id}
                    value={`${topic.title} ${chapter.title} ${topic.id}`}
                    onSelect={() => {
                      setOpen(false);
                      onSelect(topic.id);
                    }}
                  >
                    <StatusIcon status={topic.status} />
                    <span className="flex-1">{topic.title}</span>
                    <span className="text-xs text-muted-foreground">{statusWords[topic.status]}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}

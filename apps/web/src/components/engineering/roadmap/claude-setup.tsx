"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { IconChevronDown, IconCopy, IconExternalLink } from "@tabler/icons-react";
import { formatDate } from "@/components/lab/words";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toaster";
import type { Connection } from "@/features/connector/oauth-store";
import {
  CLAUDE_INSTRUCTIONS_UPDATED,
  CLAUDE_PROJECT_INSTRUCTIONS,
} from "@/features/engineering-lab/claude-instructions";
import { Connections } from "../connections";
import { ClaudeLinkField } from "./claude-link-field";

// Everything Claude needs, in one panel (docs/architecture/engineering-claude-first.md, section 9f): the connector
// address and its connections, the Project instructions to paste, and the Project link Ask Claude opens.

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast({ tone: "success", title: `${what} copied` });
  } catch {
    toast({ tone: "error", title: `Couldn't copy ${what.toLowerCase()}. Select it and copy` });
  }
}

function Step({
  number,
  title,
  state,
  done,
  children,
}: {
  number: number;
  title: string;
  state: string;
  done: boolean;
  children: ReactNode;
}) {
  return (
    <section className="grid grid-cols-[1.75rem_1fr] gap-x-3 border-b p-4 last:border-b-0">
      <span
        aria-hidden="true"
        className="flex size-7 items-center justify-center rounded-full border text-xs font-semibold"
      >
        {number}
      </span>
      <div className="grid min-w-0 gap-3">
        <div className="flex min-h-7 flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{title}</h3>
          <Badge variant={done ? "secondary" : "outline"}>{state}</Badge>
        </div>
        {children}
      </div>
    </section>
  );
}

export function ClaudeSetup({
  mcpUrl,
  connections,
  projectUrl,
}: {
  mcpUrl: string;
  connections: Connection[];
  projectUrl: string | null;
}) {
  const router = useRouter();
  const connected = connections.length > 0;
  const updated = formatDate(`${CLAUDE_INSTRUCTIONS_UPDATED}T12:00:00`);
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Claude setup
        </Button>
      </SheetTrigger>
      <SheetContent className="gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle className="text-xl">Claude setup</SheetTitle>
        </SheetHeader>
        <Step number={1} title="Connect Ken OS" state={connected ? "Connected" : "Not connected"} done={connected}>
          <div className="grid gap-1.5">
            <InputGroup>
              <InputGroupInput readOnly value={mcpUrl} aria-label="Connector address" className="font-mono text-xs" />
              <InputGroupAddon align="inline-end">
                <InputGroupButton onClick={() => void copy(mcpUrl, "Address")}>
                  <IconCopy aria-hidden="true" />
                  Copy
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            <p className="text-xs text-muted-foreground">Claude → Customize → Connectors → Add custom connector</p>
          </div>
          <Connections connections={connections} />
        </Step>
        <Step number={2} title="Project instructions" state={`Updated ${updated}`} done={false}>
          <p className="text-xs text-muted-foreground">Paste into the Project&apos;s instructions in Claude</p>
          <Collapsible className="grid gap-2">
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={() => void copy(CLAUDE_PROJECT_INSTRUCTIONS, "Instructions")}>
                <IconCopy aria-hidden="true" />
                Copy instructions
              </Button>
              <CollapsibleTrigger asChild>
                <Button type="button" size="sm" variant="ghost" className="group">
                  <span className="group-data-[state=open]:hidden">Show all</span>
                  <span className="hidden group-data-[state=open]:inline">Hide</span>
                  <IconChevronDown
                    aria-hidden="true"
                    className="transition-transform group-data-[state=open]:rotate-180"
                  />
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <p className="rounded-lg bg-muted px-3 py-2.5 text-xs leading-relaxed whitespace-pre-wrap select-all">
                {CLAUDE_PROJECT_INSTRUCTIONS}
              </p>
            </CollapsibleContent>
          </Collapsible>
        </Step>
        <Step number={3} title="Project link" state={projectUrl ? "Saved" : "Not set"} done={Boolean(projectUrl)}>
          <ClaudeLinkField
            label="Claude Project"
            value={projectUrl}
            endpoint="/api/lab/settings/project"
            placeholder="https://claude.ai/project/…"
            helper="Opened by Ask Claude on every topic"
            savedTitle="Claude Project saved"
            onSaved={() => router.refresh()}
          />
          {projectUrl && (
            <div>
              <Button asChild size="sm" variant="outline">
                <a href={projectUrl} target="_blank" rel="noreferrer">
                  Open Project
                  <IconExternalLink aria-hidden="true" />
                </a>
              </Button>
            </div>
          )}
        </Step>
      </SheetContent>
    </Sheet>
  );
}

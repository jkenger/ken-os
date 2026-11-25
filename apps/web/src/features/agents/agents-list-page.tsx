"use client";

import Link from "next/link";
import { Bot } from "lucide-react";
import { panel } from "@/components/surfaces";
import { WorkspaceShell } from "@/components/workspace-shell";
import { cn } from "@/lib/utils";

/** Agents is deliberately concrete-first (docs/product/agents-infrastructure.md) -- Loona is the only entry
 *  until a second agent actually exists, not a registry built ahead of need. */
export function AgentsListPage({ email }: { email: string }) {
  return (
    <WorkspaceShell email={email} active="agents">
      <div className="mx-auto max-w-2xl p-page">
        <Link
          href="/agents/loona"
          className={cn(panel, "flex items-center gap-3 p-4 transition-colors hover:bg-accent")}
        >
          <Bot className="size-5 text-muted-foreground" strokeWidth={1.8} aria-hidden="true" />
          <div>
            <div className="text-sm font-medium">Loona</div>
            <div className="text-xs text-muted-foreground">Chat about loans, contacts and payments</div>
          </div>
        </Link>
      </div>
    </WorkspaceShell>
  );
}

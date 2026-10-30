"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DotSeparator } from "@/components/dot-separator";
import { post } from "@/components/lab/topic/client";
import { formatDate } from "@/components/lab/words";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import type { Connection } from "@/features/connector/oauth-store";

// Apps connected to Loots through the Claude connector, with Disconnect, shown in Claude setup, whose badge says when there are none (docs/architecture/engineering-claude-connector.md,
// section 3, Revoking). Disconnect stops the app on its next call.

export function Connections({ connections }: { connections: Connection[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function disconnect(connection: Connection) {
    setBusy(connection.id);
    try {
      await post(`/api/oauth/connections/${connection.id}/disconnect`);
      toast({ tone: "success", title: `Disconnected ${connection.name}` });
      router.refresh();
    } catch (error) {
      toast({
        tone: "error",
        title: "Couldn't disconnect. Try again",
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  }

  return connections.length ? (
    <ul className="grid gap-2">
      {connections.map((connection) => (
        <li
          key={connection.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 text-xs"
        >
          <span className="min-w-0">
            <span className="block font-medium">
              {connection.name}
              <DotSeparator />
              {connection.host}
            </span>
            <span className="block text-muted-foreground">
              Connected {formatDate(connection.connectedAt)}
              {connection.lastUsedAt ? ` · Last used ${formatDate(connection.lastUsedAt)}` : ""}
            </span>
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy === connection.id}
            onClick={() => void disconnect(connection)}
          >
            {busy === connection.id ? "Disconnecting…" : "Disconnect"}
          </Button>
        </li>
      ))}
    </ul>
  ) : null;
}

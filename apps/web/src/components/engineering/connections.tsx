"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { post } from "@/components/lab/topic/client";
import { formatDate } from "@/components/lab/words";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import type { Connection } from "@/features/connector/oauth-store";

// Apps connected to Ken OS through the Claude connector, with Disconnect (docs/architecture/engineering-claude-connector.md,
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

  return (
    <div className="mt-5.5 border-t border-border px-1 pt-4 md:px-4">
      <strong className="text-xs font-semibold">Connections</strong>
      {connections.length ? (
        <ul className="mt-2.5 space-y-2">
          {connections.map((connection) => (
            <li
              key={connection.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-2.5 py-2 text-xs md:px-4"
            >
              <span className="min-w-0">
                <span className="block font-medium">
                  {connection.name} · {connection.host}
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
      ) : (
        <p className="mt-1.5 text-xs text-muted-foreground">
          No connections · add Ken OS as a custom connector in Claude
        </p>
      )}
    </div>
  );
}

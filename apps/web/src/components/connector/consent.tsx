"use client";

import { useState } from "react";
import { IconAlertCircle } from "@tabler/icons-react";
import { post } from "@/components/lab/topic/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { AuthorizeQuery } from "@/features/connector/rules";

// The consent page for the Claude connector (docs/architecture/engineering-claude-connector.md, section 3, Sign-in).
// It names the app by its host, never by the name the app gave itself.

const ALLOWS = ["Read your Engineering progress and code", "Save lessons, exercises and proof questions"];

export function ConsentCard({
  appName,
  appHost,
  redirectHost,
  query,
}: {
  appName: string;
  appHost: string;
  redirectHost: string;
  query: AuthorizeQuery;
}) {
  const [busy, setBusy] = useState<"allow" | "deny" | null>(null);
  const [problem, setProblem] = useState("");

  async function answer(decision: "allow" | "deny") {
    setBusy(decision);
    setProblem("");
    try {
      const { redirect } = await post<{ redirect: string }>("/api/oauth/authorize", { ...query, decision });
      window.location.assign(redirect);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Couldn't connect. Try again");
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center font-heading text-lg font-semibold tracking-tight">Ken OS</div>
      <Card>
        <CardHeader>
          <CardTitle>Connect Claude</CardTitle>
          <CardDescription>
            {appName} · {appHost}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <ul className="list-disc space-y-1.5 pl-5">
            {ALLOWS.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">Returns to {redirectHost} · Disconnect any time on Profile</p>
          {problem && (
            <Alert variant="destructive">
              <IconAlertCircle aria-hidden="true" />
              <AlertTitle>{problem}</AlertTitle>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button type="button" className="flex-1" disabled={busy !== null} onClick={() => void answer("allow")}>
            {busy === "allow" ? "Connecting…" : "Allow"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={busy !== null}
            onClick={() => void answer("deny")}
          >
            Deny
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export function ConsentProblem({ message }: { message: string }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center font-heading text-lg font-semibold tracking-tight">Ken OS</div>
      <Alert variant="destructive">
        <IconAlertCircle aria-hidden="true" />
        <AlertTitle>Can&apos;t connect</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    </div>
  );
}

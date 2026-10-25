"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertCircle, ExternalLink } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { WorkspaceShell } from "@/components/workspace-shell";
import { shortDate } from "@/components/profile/dates";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import type { PortfolioState } from "@/features/portfolio/store";
import { post, send } from "@/lib/api-client";

// Portfolio: what the public site shows, and one Publish for all of it. Spec: docs/architecture/portfolio.md.

const included = [
  "Name and headline",
  "City and country",
  "Summary",
  "Links",
  "Experience",
  "Education",
  "Skills",
  "Projects",
  "Certifications",
  "Languages",
  "Resume PDF, with your Resume template",
];
const excluded = ["Email, unless Show email is on", "Phone", "Local fields", "Education notes"];

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function PortfolioWorkspace({ email, portfolio }: { email: string; portfolio: PortfolioState }) {
  const [state, setState] = useState(portfolio);
  const [busy, setBusy] = useState<"publish" | "unpublish" | "email" | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const { live, latest, profileSavedAt, unpublishedChanges } = state;

  async function run(action: "publish" | "unpublish") {
    setBusy(action);
    setProblem(null);
    try {
      setState(await post<PortfolioState>(`/api/portfolio/${action}`));
      toast({ tone: "success", title: action === "publish" ? "Portfolio published" : "Portfolio unpublished" });
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Couldn't publish. Try again");
    } finally {
      setBusy(null);
    }
  }

  async function toggleEmail(showEmail: boolean) {
    setBusy("email");
    setProblem(null);
    try {
      setState(await send<PortfolioState>("/api/portfolio/settings", "PUT", { showEmail }));
      toast({ tone: "success", title: showEmail ? "Email shows after Publish" : "Email hidden after Publish" });
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Couldn't save. Try again");
    } finally {
      setBusy(null);
    }
  }

  return (
    <WorkspaceShell email={email} active="portfolio">
      <div className="mx-auto max-w-5xl px-3 pt-6 pb-24 md:px-5 md:pt-7.5">
        <PageHeading
          title="Publish"
          badge={live ? (unpublishedChanges ? "Changes not published" : "Live") : "Not published"}
          facts={
            <>
              <dt className="text-xs text-muted-foreground">Version</dt>
              <dd className="text-sm">{latest ? latest.version : "None"}</dd>
              <dt className="text-xs text-muted-foreground">Published</dt>
              <dd className="text-sm">{latest ? shortDate(latest.publishedAt) : "Never"}</dd>
              <dt className="text-xs text-muted-foreground">Profile saved</dt>
              <dd className="text-sm">{profileSavedAt ? shortDate(profileSavedAt) : "Not saved"}</dd>
            </>
          }
        />

        <div className="flex flex-col gap-4">
          {problem && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>{problem}</AlertTitle>
            </Alert>
          )}
          {!profileSavedAt && (
            <Alert>
              <AlertCircle />
              <AlertTitle>
                No details saved.{" "}
                <Link href="/profile" className="underline underline-offset-4">
                  Open Profile
                </Link>
              </AlertTitle>
            </Alert>
          )}
          <List title="Included from Profile" items={included} />
          <List title="Never published" items={excluded} />
          <Card>
            <CardHeader>
              <CardTitle>Public resume</CardTitle>
              <CardDescription>Changes go live on the next Publish</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <Label htmlFor="show-email" className="font-normal">
                Show email
              </Label>
              <Switch
                id="show-email"
                checked={state.showEmail}
                onCheckedChange={(checked) => void toggleEmail(checked)}
                disabled={busy !== null}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-end gap-2 px-3 py-3 md:px-5">
          {live && (
            <div className="mr-auto flex basis-full items-center gap-4 sm:basis-auto">
              <Button asChild variant="link" className="px-0">
                <a href="/api/public/portfolio" target="_blank" rel="noopener noreferrer">
                  Open snapshot
                  <ExternalLink aria-hidden="true" />
                </a>
              </Button>
              <Button asChild variant="link" className="px-0">
                <a href="/api/public/portfolio/resume" target="_blank" rel="noopener noreferrer">
                  Open resume
                  <ExternalLink aria-hidden="true" />
                </a>
              </Button>
            </div>
          )}
          {live && (
            <Button type="button" variant="ghost" onClick={() => void run("unpublish")} disabled={busy !== null}>
              {busy === "unpublish" ? "Unpublishing…" : "Unpublish"}
            </Button>
          )}
          <Button type="button" onClick={() => void run("publish")} disabled={busy !== null || !profileSavedAt}>
            {busy === "publish" ? "Publishing…" : "Publish"}
          </Button>
        </div>
      </div>
    </WorkspaceShell>
  );
}

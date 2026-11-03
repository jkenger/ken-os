"use client";

import Link from "next/link";
import { useState } from "react";
import { Download } from "lucide-react";
import { isPaperSize, isResumeTemplate, PAPER_SIZES, RESUME_TEMPLATES } from "@ken-os/domain";
import { PageHeading } from "@/features/profile/page-heading";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ResumeSettings } from "@/features/profile/store";
import { send } from "@/lib/api-client";
import { shortDate } from "./dates";

// The Resume page: saved Profile details through one of three ATS-safe templates. Spec: docs/product/profile-resume.md.

function pdfUrl({ template, paper }: ResumeSettings, download = false) {
  const params = new URLSearchParams({ template, paper });
  if (download) params.set("download", "1");
  return `/api/profile/resume?${params}`;
}

export function ResumePreview({
  email,
  savedAt,
  settings,
}: {
  email: string;
  /** Null before the first save: there's nothing to print yet. */
  savedAt: string | null;
  settings: ResumeSettings;
}) {
  const [choice, setChoice] = useState(settings);

  async function choose(next: ResumeSettings) {
    setChoice(next);
    try {
      await send("/api/profile/resume", "PUT", next);
    } catch (error) {
      toast({ tone: "error", title: error instanceof Error ? error.message : "Couldn't save the choice. Try again" });
    }
  }

  return (
    <WorkspaceShell email={email} active="profile">
      <div className="mx-auto max-w-5xl px-page pt-page pb-section">
        <PageHeading title="Resume" />
        {!savedAt ? (
          <Card>
            <CardHeader>
              <CardTitle>No details saved</CardTitle>
              <CardDescription>The resume prints your saved Profile details</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/profile">Add details</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
              <div className="grid gap-2">
                <Label id="template-label">Template</Label>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  aria-labelledby="template-label"
                  value={choice.template}
                  onValueChange={(value) => isResumeTemplate(value) && void choose({ ...choice, template: value })}
                >
                  {RESUME_TEMPLATES.map((template) => (
                    <ToggleGroupItem key={template.id} value={template.id}>
                      {template.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
              <div className="grid gap-2">
                <Label id="paper-label">Paper</Label>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  aria-labelledby="paper-label"
                  value={choice.paper}
                  onValueChange={(value) => isPaperSize(value) && void choose({ ...choice, paper: value })}
                >
                  {PAPER_SIZES.map((paper) => (
                    <ToggleGroupItem key={paper.id} value={paper.id}>
                      {paper.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <span className="text-sm text-muted-foreground">From details saved {shortDate(savedAt)}</span>
                <Button asChild>
                  <a href={pdfUrl(choice, true)}>
                    Download PDF
                    <Download data-icon="inline-end" aria-hidden="true" />
                  </a>
                </Button>
              </div>
            </div>
            {/* White on purpose: a PDF page is drawn on white whatever the theme. */}
            <iframe
              key={`${choice.template}-${choice.paper}`}
              className="h-[80vh] min-h-160 w-full rounded-lg border bg-white"
              title="Resume preview"
              src={pdfUrl(choice)}
            />
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}

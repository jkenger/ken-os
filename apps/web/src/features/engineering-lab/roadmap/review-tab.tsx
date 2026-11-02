"use client";

import { useEffect, useState, type ReactNode } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { DotSeparator } from "@/components/dot-separator";
import { formatDate } from "@/features/engineering-lab/words";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReviewPoint } from "@/features/engineering-lab/review-sheet";
import type { ReviewView } from "@/features/engineering-lab/review-store";

// A topic's Review tab (docs/architecture/engineering-claude-first.md, section 9h): Claude's review sheet by point, the
// key terms, the owner's passing code and their own explanation, then the notes. Test yourself hides every answer and
// shows each point as a question, to answer before Claude's fresh check.
// Grids use grid-cols-1 (minmax(0, 1fr)) so a long code line scrolls inside its block instead of widening the panel.

const sectionTitle = "mb-2 text-xs font-semibold text-muted-foreground";
const codeBlock = "overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed";

async function load(topicId: string, version: number | null): Promise<ReviewView> {
  const query = version ? `?version=${version}` : "";
  const response = await fetch(`/api/lab/topics/${encodeURIComponent(topicId)}/review${query}`);
  const body = (await response.json().catch(() => ({}))) as ReviewView & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Couldn't load the review. Try again");
  return body;
}

function Answer({ point }: { point: ReviewPoint }) {
  return (
    <div className="grid grid-cols-1 gap-2">
      <p className="text-sm leading-relaxed">{point.explanation}</p>
      <pre className={codeBlock}>
        <code>{point.example}</code>
      </pre>
      <div className="text-sm">
        <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          Avoid
          {point.ownMistake && <Badge variant="outline">Your mistake</Badge>}
        </p>
        <p className="mt-0.5 leading-relaxed">{point.mistake}</p>
      </div>
    </div>
  );
}

function Question({ point }: { point: ReviewPoint }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <p className="text-sm font-medium">{point.question}</p>
      <CollapsibleTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="mt-1 -ml-2">
          <IconChevronDown aria-hidden="true" className={open ? "rotate-180" : undefined} />
          {open ? "Hide answer" : "Show answer"}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <Answer point={point} />
      </CollapsibleContent>
    </Collapsible>
  );
}

export function ReviewTab({ topicId, notes }: { topicId: string; notes: ReactNode }) {
  const [review, setReview] = useState<ReviewView | null>(null);
  const [problem, setProblem] = useState("");
  const [version, setVersion] = useState<number | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setVersion(null);
    setTesting(false);
  }, [topicId]);

  useEffect(() => {
    let current = true;
    setProblem("");
    load(topicId, version)
      .then((next) => current && setReview(next))
      .catch((error: unknown) => {
        if (current) setProblem(error instanceof Error ? error.message : "Couldn't load the review. Try again");
      });
    return () => {
      current = false;
    };
  }, [topicId, version]);

  if (problem) return <p className="text-sm text-destructive">{problem}</p>;
  if (!review || review.topicId !== topicId)
    return (
      <div className="grid gap-3">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-24 w-full" />
      </div>
    );

  const { sheet } = review;
  const latest = review.versions[0]?.version ?? null;
  return (
    <div className="grid grid-cols-1 gap-6">
      {sheet ? (
        <section className="grid grid-cols-1 gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {review.versions.length > 1 ? (
              <NativeSelect
                size="sm"
                aria-label="Version"
                value={String(sheet.version)}
                onChange={(event) => setVersion(Number(event.target.value))}
              >
                {review.versions.map((item) => (
                  <NativeSelectOption key={item.version} value={item.version}>
                    {`Version ${item.version} · ${formatDate(item.savedAt)}${item.version === latest ? " · Latest" : ""}`}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            ) : (
              <p className="text-xs text-muted-foreground">Saved {formatDate(sheet.savedAt)}</p>
            )}
            <Button
              type="button"
              size="sm"
              variant={testing ? "default" : "outline"}
              aria-pressed={testing}
              onClick={() => setTesting((on) => !on)}
            >
              {testing ? "Show answers" : "Test yourself"}
            </Button>
          </div>
          <ol className="grid grid-cols-1 gap-5">
            {sheet.sheet.points.map((point, index) => (
              <li key={point.pointId} className="border-t pt-4">
                <p className="text-xs font-semibold text-muted-foreground">
                  {`Point ${index + 1}`}
                  {!testing && review.points[index] ? ` · ${review.points[index]}` : ""}
                </p>
                <div className="mt-2">{testing ? <Question point={point} /> : <Answer point={point} />}</div>
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <section>
          <p className="text-sm font-medium">No review sheet</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Claude writes one once every point is taught</p>
        </section>
      )}
      {!testing && (
        <>
          {sheet && sheet.sheet.terms.length > 0 && (
            <section>
              <h3 className={sectionTitle}>Terms</h3>
              <dl className="divide-y border-y text-sm">
                {sheet.sheet.terms.map((term) => (
                  <div key={term.term} className="py-2">
                    <dt className="font-medium">{term.term}</dt>
                    <dd className="text-muted-foreground">{term.meaning}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
          {review.passingCode && (
            <section>
              <h3 className={sectionTitle}>
                Your code
                <DotSeparator />
                passed {formatDate(review.passingCode.at)}
              </h3>
              <pre className={codeBlock}>
                <code>{review.passingCode.code}</code>
              </pre>
            </section>
          )}
          {review.explanation && (
            <section>
              <h3 className={sectionTitle}>
                Your explanation
                <DotSeparator />
                {formatDate(review.explanation.at)}
              </h3>
              <blockquote className="border-l-2 pl-3 text-sm leading-relaxed whitespace-pre-wrap">
                {review.explanation.text}
              </blockquote>
            </section>
          )}
          <section>
            <h3 className={sectionTitle}>Notes</h3>
            {notes}
          </section>
        </>
      )}
    </div>
  );
}

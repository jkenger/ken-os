"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import type { TopicView } from "@/features/engineering-lab/store";
import { DisclosureSummary } from "@/components/ui/disclosure-summary";
import { cn } from "@/lib/utils";
import { CodeBlock, Markdown } from "../markdown";
import { label } from "../words";

type Lesson = NonNullable<TopicView["lesson"]>;

interface Section { id: string; title: string; body: ReactNode; tone?: "gap" | "panel" }

/** The lesson as a reading page: a sticky outline that follows the scroll, and one column about 680px wide. */
export function LessonReader({ lesson, sources, sourceCheckedAt, footer }: { lesson: Lesson; sources: TopicView["sources"]; sourceCheckedAt: string | null; footer?: ReactNode }) {
  const sections: Section[] = [
    { id: "why", title: "Why it matters", body: <Markdown text={lesson.sections.whyItMatters} /> },
    { id: "know", title: "What you already know", body: <Markdown text={lesson.sections.whatYouKnow} /> },
    { id: "gap", title: "The gap", body: <Markdown text={lesson.sections.theGap} />, tone: "gap" },
    { id: "theory", title: "The theory", body: <Markdown text={lesson.sections.theory} /> },
    { id: "model", title: "Mental model", body: <Markdown text={lesson.sections.mentalModel} />, tone: "panel" },
    { id: "example", title: "Worked example", body: <><CodeBlock code={lesson.sections.workedExample.code} label="Worked example" /><div className="mt-3"><Markdown text={lesson.sections.workedExample.walkthrough} /></div></> },
  ];
  if (lesson.deeper?.length) {
    sections.push({
      id: "deeper", title: "Go deeper", body: (
        <>
          <p className="text-sm text-muted-foreground">Optional</p>
          <div className="mt-3 divide-y divide-border border-y border-border">
            {lesson.deeper.map((item) => (
              <details key={item.title} className="group py-3">
                <DisclosureSummary className="text-sm font-semibold">{item.title}</DisclosureSummary>
                <div className="mt-2 pl-6"><Markdown text={item.body} /></div>
              </details>
            ))}
          </div>
        </>
      ),
    });
  }
  if (lesson.noteSuggestions.length) {
    sections.push({ id: "notes", title: "For your notes", body: <><p className="text-sm text-muted-foreground">Write up in Obsidian, in your own words</p><ul className="mt-2 list-disc pl-5 text-sm">{lesson.noteSuggestions.map((item) => <li key={item}>{item}</li>)}</ul></> });
  }
  const httpsSources = sources.filter((source) => source.url.startsWith("https://"));
  if (httpsSources.length) {
    sections.push({
      id: "sources", title: "Sources", body: (
        <>
          {sourceCheckedAt && <p className="text-sm text-muted-foreground">Checked {sourceCheckedAt}.</p>}
          <ul className="mt-2 space-y-3">
            {httpsSources.map((source) => (
              <li key={source.url} className="text-sm"><a className="inline-flex items-center gap-1.5 font-semibold underline-offset-4 hover:underline" href={source.url} target="_blank" rel="noopener noreferrer">{source.title}<ExternalLink size={13} aria-hidden="true" /></a><p className="text-muted-foreground">{source.whyItMatters}</p></li>
            ))}
          </ul>
        </>
      ),
    });
  }

  const [current, setCurrent] = useState(sections[0].id);
  const ids = sections.map((section) => section.id).join(",");
  useEffect(() => {
    const targets = ids.split(",").map((id) => document.getElementById(`lesson-${id}`)).filter((item): item is HTMLElement => Boolean(item));
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).map((entry) => entry.target.id.replace("lesson-", ""));
      if (visible.length) setCurrent(ids.split(",").find((id) => visible.includes(id))!);
    }, { rootMargin: "-140px 0px -55% 0px" });
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [ids]);

  return (
    <div className="grid gap-10 lg:grid-cols-[190px_minmax(0,1fr)]">
      <nav aria-label="Lesson outline" className="hidden lg:block">
        <div className="sticky top-28">
          <p className={label}>On this page</p>
          <ol className="mt-3 space-y-2 border-l border-border text-sm">
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`#lesson-${section.id}`} aria-current={current === section.id ? "location" : undefined}
                  className={cn("-ml-px block border-l-2 pl-3 hover:text-foreground", current === section.id ? "border-foreground font-semibold text-foreground" : "border-transparent text-muted-foreground")}>{section.title}</a>
              </li>
            ))}
          </ol>
        </div>
      </nav>
      <article className="max-w-2xl space-y-9">
        {sections.map((section) => (
          <section key={section.id} id={`lesson-${section.id}`} className={cn("scroll-mt-32", section.tone === "gap" && "border-l-2 border-destructive pl-4", section.tone === "panel" && "rounded-xl bg-muted p-5")}>
            <h3 className="mb-2 font-heading text-lg font-semibold tracking-tight">{section.title}</h3>
            {section.body}
          </section>
        ))}
        {footer}
      </article>
    </div>
  );
}

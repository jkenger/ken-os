"use client";

import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, Check, ChevronRight, ExternalLink, Play, RotateCcw, Search, Sparkles } from "lucide-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Button } from "@/components/ui/button";
import { DisclosureSummary } from "@/components/ui/disclosure-summary";
import { Markdown } from "@/components/lab/markdown";
import { cn } from "@/lib/utils";
import { check, isGap, lab, lesson, practice, statusText, tracks, type MockStatus, type MockTopic } from "./mock-data";
import { CodeEditor, eyebrow, Pill, PredictionDiff, RubricChecklist, StepBar, TermLookup, UntestedIcon, useTerms, type Step, type StepId, type Tone } from "./parts";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

export type Screen = "today" | "course" | "topic" | "terms";

const screens: { id: Screen; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "course", label: "Course" },
  { id: "topic", label: "Topic" },
  { id: "terms", label: "Terms" },
];

const page = "mx-auto w-full max-w-[1100px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10";
const title = "font-display text-4xl font-bold leading-[1.08] tracking-[-0.065em] sm:text-5xl";
const heading = "font-display text-2xl font-semibold tracking-[-0.05em]";

const statusTone: Record<MockStatus, Tone> = {
  proven: "solid", known: "neutral", practicing: "partial", learning: "partial", revisit: "gap", not_started: "neutral", untested: "quiet", unwritten: "neutral",
};

function StatusPill({ status }: { status: MockStatus }) {
  return <Pill tone={statusTone[status]} icon={status === "proven" ? <Check size={12} aria-hidden="true" /> : status === "untested" ? <UntestedIcon /> : undefined}>{statusText[status]}</Pill>;
}

// ---------- Today ----------

function Today({ go }: { go: (screen: Screen, step?: StepId) => void }) {
  return (
    <div className={page}>
      <p className={eyebrow}>ENGINEERING LAB · TODAY</p>
      <h1 className={cn(title, "mt-3")}>Pick up where you left off.</h1>

      <article className="mt-8 rounded-xl border border-border p-6 sm:p-8">
        <p className={eyebrow}>CONTINUE · FULL-STACK · CHAPTER 1</p>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.05em]">Event loop, tasks and microtasks</h2>
        <p className="mt-2 text-[15px] text-muted-foreground">Step 2 of 4 · Practice · 1 of 2 predictions done</p>
        <div className="mt-5 grid grid-cols-4 gap-1.5" aria-hidden="true">
          {["done", "current", "todo", "todo"].map((state, index) => <span key={index} className={cn("h-1.5 rounded-full", state === "done" ? "bg-status-solid" : state === "current" ? "bg-foreground" : "bg-border")} />)}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button type="button" size="lg" onClick={() => go("topic", "practice")}>Continue practice<ArrowRight aria-hidden="true" /></Button>
          <span className="text-sm text-muted-foreground">About 10 minutes left in this topic</span>
        </div>
      </article>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-border p-5" aria-labelledby="due">
          <p className={eyebrow} id="due">REVIEWS DUE · 1</p>
          <Button variant="outline" type="button" className="mt-3 h-auto w-full justify-between gap-3 whitespace-normal rounded-lg border-border px-4 py-3 text-left font-normal hover:bg-muted/60" onClick={() => go("topic", "check")}>
            <span><span className="block text-sm font-semibold">From URL to response, including HTTPS</span><span className="text-sm text-muted-foreground">You missed a review on Oct 1</span></span>
            <StatusPill status="revisit" />
          </Button>
        </section>
        <section className="rounded-xl border border-dashed border-input p-5" aria-labelledby="daily">
          <p className={eyebrow} id="daily">DAILY PRACTICE · COMES WITH V1</p>
          <p className="mt-3 text-sm leading-5">About 15 minutes of mixed recall from topics you&apos;ve proven, plus terms you saved. It will sit here as a second card, and works on a phone.</p>
        </section>
      </div>

      <section className="mt-8" aria-labelledby="changes">
        <p className={eyebrow} id="changes">RECENT CHANGES</p>
        <ul className="mt-3 divide-y divide-border border-y border-border text-sm">
          <li className="flex flex-wrap items-center justify-between gap-2 py-3"><span>Transactions and all-or-nothing writes</span><span className="flex items-center gap-2"><StatusPill status="proven" /><span className="text-muted-foreground">Oct 1</span></span></li>
          <li className="flex flex-wrap items-center justify-between gap-2 py-3"><span>Event loop, tasks and microtasks</span><span className="flex items-center gap-2"><StatusPill status="practicing" /><span className="text-muted-foreground">Oct 2</span></span></li>
        </ul>
      </section>
    </div>
  );
}

// ---------- Course ----------

function TopicRow({ topic, number, go }: { topic: MockTopic; number: string; go: (screen: Screen, step?: StepId) => void }) {
  const unwritten = topic.status === "unwritten";
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
      <span className="w-8 shrink-0 font-mono text-xs text-muted-foreground">{number}</span>
      {unwritten
        ? <span className="min-w-0 flex-1 text-[15px] text-muted-foreground">{topic.title}</span>
        : <Button variant="link" type="button" className="h-auto min-w-0 flex-1 justify-start px-0 text-left text-[15px] font-semibold text-foreground" onClick={() => go("topic", "learn")}>{topic.title}</Button>}
      <span className="flex items-center gap-2">
        {topic.status === "untested" && <Button type="button" size="sm" variant="outline">Placement check · 3 questions</Button>}
        <StatusPill status={topic.status} />
      </span>
    </li>
  );
}

function Course({ go }: { go: (screen: Screen, step?: StepId) => void }) {
  const [trackId, setTrackId] = useState<"fullstack" | "ai">("fullstack");
  const [gapsOnly, setGapsOnly] = useState(false);
  const track = tracks.find((item) => item.id === trackId)!;
  const all = track.chapters.flatMap((chapter) => chapter.topics);
  const proven = all.filter((topic) => topic.status === "proven").length;
  const gaps = all.filter(isGap).length;

  return (
    <div className={page}>
      <p className={eyebrow}>ENGINEERING LAB · COURSE</p>
      <h1 className={cn(title, "mt-3")}>The whole course, in order.</h1>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-4 border-b border-border">
        <Tabs value={trackId} onValueChange={(next) => setTrackId(next as typeof trackId)}>
          <TabsList variant="line" aria-label="Tracks" className="gap-1 group-data-horizontal/tabs:h-auto">
            {tracks.map((item) => <TabsTrigger key={item.id} value={item.id} className="flex-none px-4 py-3 font-semibold">{item.title}</TabsTrigger>)}
          </TabsList>
        </Tabs>
        <Label className="mb-2 flex cursor-pointer items-center gap-3 text-sm font-semibold">
          My gaps only
          <Switch checked={gapsOnly} onCheckedChange={setGapsOnly} />
        </Label>
      </div>

      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-3">
        <p className="max-w-[560px] text-[15px] text-muted-foreground">{track.summary}</p>
        <p className="text-sm"><strong>{proven}</strong> of {all.length} proven · <strong>{gaps}</strong> gaps to close</p>
      </div>
      {gapsOnly && <p className="mt-3 rounded-lg bg-muted px-4 py-3 text-sm">Showing only gaps: topics the baseline, a placement check or a proof hasn&apos;t shown you know. Topics nobody has assessed yet stay, with a placement check.</p>}

      <div className="mt-6 space-y-8">
        {track.chapters.map((chapter, chapterIndex) => {
          const shown = gapsOnly ? chapter.topics.filter(isGap) : chapter.topics;
          const done = chapter.topics.filter((topic) => topic.status === "proven" || topic.known).length;
          const written = chapter.topics.filter((topic) => topic.status !== "unwritten").length;
          return (
            <section key={chapter.id} aria-labelledby={chapter.id}>
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
                <div>
                  <p className={eyebrow}>CHAPTER {chapterIndex + 1}</p>
                  <h2 className={cn(heading, "mt-1")} id={chapter.id}>{chapter.title}</h2>
                </div>
                <div className="w-40 text-right text-sm">
                  {written ? <>{done} of {chapter.topics.length} known or proven</> : <span className="text-muted-foreground">Not written yet</span>}
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border" aria-hidden="true"><div className="h-full bg-status-solid" style={{ width: `${(done / chapter.topics.length) * 100}%` }} /></div>
                </div>
              </div>
              {shown.length > 0 && <ol className="divide-y divide-border">{shown.map((topic) => <TopicRow key={topic.id} topic={topic} number={`${chapterIndex + 1}.${chapter.topics.indexOf(topic) + 1}`} go={go} />)}</ol>}
              {gapsOnly && (() => {
                const unwrittenCount = chapter.topics.filter((topic) => topic.status === "unwritten").length;
                if (!written) return <p className="py-3 text-sm text-muted-foreground">{unwrittenCount} topics planned, not written yet.</p>;
                if (!shown.length) return <p className="py-3 text-sm text-muted-foreground">No gaps here: everything written is known or proven.</p>;
                return unwrittenCount ? <p className="pb-1 pt-2 text-sm text-muted-foreground">Plus {unwrittenCount} not written yet.</p> : null;
              })()}
            </section>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Topic ----------

function LearnStep({ next }: { next: () => void }) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const sections = lesson.outline.map((_, index) => document.getElementById(`lesson-${index}`)).filter((item): item is HTMLElement => Boolean(item));
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).map((entry) => Number(entry.target.id.split("-")[1]));
      if (visible.length) setCurrent(Math.min(...visible));
    }, { rootMargin: "-120px 0px -55% 0px" });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);
  return (
    <div className="grid gap-10 lg:grid-cols-[200px_minmax(0,1fr)]">
      <nav aria-label="Lesson outline" className="hidden lg:block">
        <div className="sticky top-24">
          <p className={eyebrow}>ON THIS PAGE</p>
          <ol className="mt-3 space-y-2 border-l border-border text-sm">
            {lesson.outline.map((item, index) => <li key={item}><a href={`#lesson-${index}`} className={cn("-ml-px block border-l-2 pl-3 hover:text-foreground", index === current ? "border-foreground font-semibold" : "border-transparent text-muted-foreground")}>{item}</a></li>)}
          </ol>
        </div>
      </nav>
      <article className="max-w-[680px] space-y-8">
        <p className="rounded-lg bg-muted px-4 py-3 text-sm">Select any word you don&apos;t know, such as <strong>call stack</strong> or <strong>task</strong>, then press <strong>Explain</strong>.</p>
        <section id="lesson-0"><h3 className="mb-2 font-display text-lg font-semibold">Why it matters</h3><Markdown text={lesson.whyItMatters} /></section>
        <section id="lesson-1"><h3 className="mb-2 font-display text-lg font-semibold">What you already know</h3><Markdown text={lesson.whatYouKnow} /></section>
        <section id="lesson-2" className="border-l-2 border-status-gap pl-4"><h3 className="mb-2 font-display text-lg font-semibold">The gap</h3><Markdown text={lesson.theGap} /></section>
        <section id="lesson-3"><h3 className="mb-2 font-display text-lg font-semibold">The theory</h3><Markdown text={lesson.theory.map((line, index) => `${index + 1}. ${line}`).join("\n")} /></section>
        <section id="lesson-4" className="rounded-xl bg-muted p-5"><h3 className="mb-2 font-display text-lg font-semibold">Mental model</h3><Markdown text={lesson.mentalModel} /></section>
        <section id="lesson-5"><h3 className="mb-3 font-display text-lg font-semibold">Worked example</h3><CodeEditor value={lesson.workedExample} readOnly label="Worked example" /><div className="mt-3"><Markdown text={lesson.walkthrough} /></div></section>
        <section id="lesson-6">
          <h3 className="font-display text-lg font-semibold">Go deeper</h3>
          <p className="text-sm text-muted-foreground">Optional. Open what you&apos;re curious about.</p>
          <div className="mt-3 divide-y divide-border border-y border-border">
            {lesson.deeper.map((item) => <details key={item.title} className="group py-3"><DisclosureSummary className="text-[15px] font-semibold">{item.title}</DisclosureSummary><div className="mt-2 pl-6"><Markdown text={item.body} /></div></details>)}
          </div>
        </section>
        <section className="border-t border-border pt-6">
          <p className={eyebrow}>SOURCES · CHECKED OCT 1</p>
          <a className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline" href="https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide" target="_blank" rel="noopener noreferrer">Using microtasks in JavaScript<ExternalLink size={13} aria-hidden="true" /></a>
        </section>
        <Button type="button" onClick={next}>Next: Practice<ArrowRight aria-hidden="true" /></Button>
      </article>
    </div>
  );
}

function ResultHeader({ tone, label, line }: { tone: Tone; label: string; line: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Pill tone={tone} icon={tone === "solid" ? <Check size={12} aria-hidden="true" /> : undefined}>{label}</Pill>
      <p className="text-sm">{line}</p>
    </div>
  );
}

function PracticeStep({ next }: { next: () => void }) {
  const [index, setIndex] = useState(0);
  const [solved, setSolved] = useState(false);
  const [draft, setDraft] = useState("");
  const item = practice[index];
  return (
    <div className="mx-auto max-w-[720px]">
      <div className="flex items-center justify-between gap-3">
        <p className={eyebrow}>PREDICTION {index + 1} OF {practice.length}</p>
        <div className="flex gap-1.5" aria-hidden="true">{practice.map((_, dot) => <span key={dot} className={cn("h-1.5 w-8 rounded-full", dot < index ? "bg-status-solid" : dot === index ? "bg-foreground" : "bg-border")} />)}</div>
      </div>
      <p className="mt-3 text-lg leading-7">{item.prompt}</p>
      <div className="mt-4"><CodeEditor key={index} value={item.code} readOnly label="Code to predict" /></div>

      {index === 0 ? (
        <div className="mt-5 rounded-xl border border-border p-5">
          <ResultHeader tone="gap" label="Misconception" line="Right lines, wrong order. That points at the ordering rule, not the values." />
          <PredictionDiff actual={item.actual} answer={item.answer!} />
          <p className="mt-4 text-sm"><span className="font-semibold">Your why: </span>{item.why}</p>
          <div className="mt-4 rounded-lg bg-muted p-4"><p className="mb-1 text-sm font-semibold">Why it prints this</p><Markdown text={item.explanation} /></div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm"><RotateCcw aria-hidden="true" />Try again</Button>
            <Button type="button" size="sm" onClick={() => setIndex(1)}>Next prediction<ArrowRight aria-hidden="true" /></Button>
          </div>
        </div>
      ) : solved ? (
        <div className="mt-5 rounded-xl border border-border p-5" role="status">
          <ResultHeader tone="solid" label="Solid" line="That's the drain rule exactly: a microtask queued mid-drain still runs before the timer." />
          <PredictionDiff actual={item.actual} answer={item.actual} />
          <div className="mt-4 rounded-lg bg-muted p-4"><p className="mb-1 text-sm font-semibold">Why it prints this</p><Markdown text={item.explanation} /></div>
          <Button type="button" className="mt-4" size="sm" onClick={next}>Next: Lab<ArrowRight aria-hidden="true" /></Button>
        </div>
      ) : (
        <div className="mt-5">
          <Label className="block"><span className="mb-2 block text-sm font-semibold">What it prints, one line per log</span>
            <Textarea className="min-h-[110px] w-full rounded-lg border border-input bg-background px-3 py-2.5 font-mono text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={"now\nfirst\n..."} /></Label>
          <Label className="mt-3 block"><span className="block text-sm font-semibold">Why</span><span className="mb-2 block text-sm text-muted-foreground">Optional and not graded. Compare it with the explanation after you check.</span>
            <Textarea className="min-h-[72px] w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50" /></Label>
          <Button type="button" className="mt-3" onClick={() => setSolved(true)}><Play aria-hidden="true" />Check by running it</Button>
          <p className="mt-2 text-xs text-muted-foreground">Mockup: any answer shows the Solid result.</p>
        </div>
      )}
    </div>
  );
}

function LabStep({ next }: { next: () => void }) {
  const [tab, setTab] = useState<"brief" | "code">("brief");
  const [ran, setRan] = useState(false);
  const brief = (
    <div className="space-y-5">
      <Markdown text={lab.readme} />
      <details className="group"><DisclosureSummary className="text-sm font-semibold">See the tests</DisclosureSummary><p className="mt-2 pl-6 text-sm text-muted-foreground">The tests open here, read-only.</p></details>
    </div>
  );
  const code = (
    <div>
      <CodeEditor value={lab.starter} label="Your code" minHeight={260} />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" onClick={() => setRan(true)}><Play aria-hidden="true" />Run tests</Button>
        <Button type="button" variant="outline"><RotateCcw aria-hidden="true" />Reset</Button>
        <Button type="button" variant="ghost">Show solution</Button>
      </div>
      {ran && (
        <div className="mt-4 rounded-xl border border-border p-4" role="status">
          <ResultHeader tone="partial" label="1 of 2 passing" line="Close. One ordering test still fails." />
          <ul className="mt-3 space-y-2 text-sm">
            {lab.tests.map((test) => <li key={test.name} className="flex items-center gap-2"><Pill tone={test.passed ? "solid" : "gap"}>{test.passed ? "Pass" : "Fail"}</Pill>{test.name}</li>)}
          </ul>
          <Button type="button" className="mt-4" size="sm" variant="outline" onClick={next}>Go to Check<ArrowRight aria-hidden="true" /></Button>
        </div>
      )}
    </div>
  );
  return (
    <div>
      <h3 className={heading}>{lab.title}</h3>
      <Tabs value={tab} onValueChange={(next) => setTab(next as typeof tab)} className="mt-4 border-b border-border lg:hidden">
        <TabsList variant="line" aria-label="Lab panels" className="gap-1 group-data-horizontal/tabs:h-auto">
          {(["brief", "code"] as const).map((id) => <TabsTrigger key={id} value={id} className="flex-none px-4 py-2.5 font-semibold">{id === "brief" ? "Instructions" : "Code"}</TabsTrigger>)}
        </TabsList>
      </Tabs>
      <div className="mt-5 lg:hidden">{tab === "brief" ? brief : code}</div>
      <div className="mt-5 hidden gap-8 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="lg:sticky lg:top-24 lg:self-start">{brief}</div>
        {code}
      </div>
    </div>
  );
}

function CheckStep() {
  const [rating, setRating] = useState<number | null>(4);
  const [proven, setProven] = useState(false);
  return (
    <div className="mx-auto max-w-[720px] space-y-6">
      {proven && (
        <div className="rounded-xl bg-status-solid-surface p-6 text-status-solid" role="status">
          <p className="flex items-center gap-2 text-sm font-bold tracking-[0.12em]"><Sparkles size={16} aria-hidden="true" />TOPIC PROVEN</p>
          <p className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em] text-foreground">Event loop, tasks and microtasks</p>
          <p className="mt-1 text-sm text-foreground">Every part shown, two of them by running code. First review on Oct 5.</p>
        </div>
      )}
      <p className="text-sm text-muted-foreground">Written by a separate assessor that hasn&apos;t seen the lesson.</p>

      <article className="rounded-xl border border-border p-5">
        <p className={eyebrow}>QUESTION 1 OF 2 · PREDICT THE OUTPUT</p>
        <p className="mt-2 text-[15px]">{check.predict.prompt}</p>
        <div className="mt-3"><CodeEditor value={check.predict.code} readOnly label="Question code" /></div>
        <div className="mt-4 border-t border-border pt-4">
          <ResultHeader tone="partial" label="Partly there" line="You skipped the inner call's lines." />
          <PredictionDiff actual={check.predict.actual} answer={check.predict.answer} />
          <div className="mt-4 rounded-lg bg-muted p-4"><p className="mb-1 text-sm font-semibold">Why it prints this</p><Markdown text={check.predict.explanation} /></div>
        </div>
      </article>

      <article className="rounded-xl border border-border p-5">
        <p className={eyebrow}>QUESTION 2 OF 2 · EXPLAIN IT</p>
        <p className="mt-2 text-[15px]">{check.written.prompt}</p>
        <fieldset className="mt-4">
          <legend className="text-sm font-semibold">How sure were you, before answering?</legend>
          <p className="mt-1 text-sm text-muted-foreground">This doesn&apos;t change your grade. It flags answers you were sure about but got wrong.</p>
          <div className="mt-2 flex flex-wrap gap-1.5">{[1, 2, 3, 4, 5].map((value) => <Button key={value} type="button" size="sm" variant={rating === value ? "default" : "outline"} aria-pressed={rating === value} onClick={() => setRating(value)}>{value}{value === 1 ? " guessing" : value === 5 ? " certain" : ""}</Button>)}</div>
        </fieldset>
        <div className="mt-4 border-t border-border pt-4">
          <ResultHeader tone="partial" label="Partly there" line={check.written.feedback} />
          <p className="mt-3 text-sm"><span className="font-semibold">Your answer: </span>{check.written.answer}</p>
          <RubricChecklist items={check.written.rubric} />
        </div>
      </article>

      <Button type="button" variant="outline" onClick={() => setProven(!proven)}>{proven ? "Hide" : "Show"} the proven moment (mockup)</Button>
    </div>
  );
}

const topicSteps: Step[] = [
  { id: "learn", label: "Learn", detail: "Read", state: "done" },
  { id: "practice", label: "Practice", detail: "1 of 2 done", state: "current" },
  { id: "lab", label: "Lab", detail: "Not run yet", state: "todo" },
  { id: "check", label: "Check", detail: "2 questions", state: "todo" },
];

function Topic({ step, setStep }: { step: StepId; setStep: (step: StepId) => void }) {
  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <header className="px-5 pb-6 pt-8 sm:px-8 lg:px-10 lg:pt-10">
        <p className={cn(eyebrow, "flex flex-wrap items-center gap-1")}>FULL-STACK<ChevronRight size={12} aria-hidden="true" />CHAPTER 1 · JAVASCRIPT RUNTIME AND ASYNC</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-3xl font-bold leading-[1.1] tracking-[-0.06em] sm:text-4xl">{lesson.title}</h1>
          <StatusPill status="practicing" />
        </div>
      </header>
      <div className="sticky top-0 z-10 bg-background">
        <StepBar steps={topicSteps} active={step} suggested="practice" onSelect={setStep} />
      </div>
      <div className="px-5 py-8 sm:px-8 lg:px-10">
        {step === "learn" && <LearnStep next={() => setStep("practice")} />}
        {step === "practice" && <PracticeStep next={() => setStep("lab")} />}
        {step === "lab" && <LabStep next={() => setStep("check")} />}
        {step === "check" && <CheckStep />}
      </div>
    </div>
  );
}

// ---------- Terms ----------

function TermsPage() {
  const { terms } = useTerms();
  const [query, setQuery] = useState("");
  const shown = terms.filter((term) => `${term.term} ${term.meaning}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className={page}>
      <p className={eyebrow}>KEN OS · TERMS</p>
      <h1 className={cn(title, "mt-3")}>Words you looked up.</h1>
      <p className="mt-3 max-w-[600px] text-[15px] text-muted-foreground">Saved from any Ken OS page. Each one links back to where you found it, and will show up in daily practice once that exists.</p>
      <InputGroup className="mt-6 max-w-[420px]">
        <InputGroupAddon><Search size={16} aria-hidden="true" /></InputGroupAddon>
        <InputGroupInput placeholder="Search your terms" aria-label="Search your terms" value={query} onChange={(event) => setQuery(event.target.value)} />
      </InputGroup>
      <ul className="mt-6 divide-y divide-border border-y border-border">
        {shown.map((term) => (
          <li key={term.term} className="grid gap-2 py-5 md:grid-cols-[200px_minmax(0,1fr)]">
            <p className="font-display text-lg font-semibold tracking-[-0.02em]">{term.term}</p>
            <div>
              <p className="text-[15px] leading-6">{term.meaning}</p>
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="inline-flex items-center gap-1.5"><BookOpen size={14} aria-hidden="true" />{term.foundIn}</span>
                <a className="inline-flex items-center gap-1.5 font-semibold underline-offset-4 hover:underline" href={term.source.url} target="_blank" rel="noopener noreferrer">{term.source.title}<ExternalLink size={12} aria-hidden="true" /></a>
                <span className="text-muted-foreground">Saved {term.savedAt}</span>
              </p>
            </div>
          </li>
        ))}
        {!shown.length && <li className="py-5 text-sm text-muted-foreground">No saved term matches.</li>}
      </ul>
    </div>
  );
}

// ---------- Wrapper ----------

export function LabUiPreview({ initialScreen, initialStep }: { initialScreen: Screen; initialStep: StepId }) {
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [step, setStep] = useState<StepId>(initialStep);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("screen", screen);
    if (screen === "topic") url.searchParams.set("step", step); else url.searchParams.delete("step");
    window.history.replaceState(null, "", url);
  }, [screen, step]);

  const go = (next: Screen, nextStep?: StepId) => {
    setScreen(next);
    if (nextStep) setStep(nextStep);
    window.scrollTo({ top: 0 });
  };
  const place = screen === "topic" ? `${lesson.title} · ${step[0].toUpperCase()}${step.slice(1)}` : screens.find((item) => item.id === screen)!.label;

  return (
    <WorkspaceShell email="preview@example.invalid" active="lab" preview termLookup={false}>
      <div className="min-h-[calc(100vh-88px)] border-x border-border">
        <div className="flex flex-wrap items-center gap-2 border-b border-dashed border-input bg-muted/50 px-5 py-2.5 text-sm sm:px-8 lg:px-10">
          <span className="font-semibold">UI direction mockup</span>
          <span className="text-muted-foreground">·</span>
          {screens.map((item) => <Button key={item.id} type="button" size="sm" variant={item.id === screen ? "default" : "ghost"} aria-pressed={item.id === screen} onClick={() => go(item.id)}>{item.label}</Button>)}
        </div>
        <TermLookup place={place}>
          {screen === "today" && <Today go={go} />}
          {screen === "course" && <Course go={go} />}
          {screen === "topic" && <Topic step={step} setStep={(next) => { setStep(next); window.scrollTo({ top: 0 }); }} />}
          {screen === "terms" && <TermsPage />}
        </TermLookup>
      </div>
    </WorkspaceShell>
  );
}

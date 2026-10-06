import { notFound } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { ResumeWorkspace } from "@/components/resume-workspace";
import { SkillsWorkspace } from "@/components/skills-workspace";
import { ProjectMemoryPreview } from "@/components/project-memory-preview";
import { DesignSystemWorkspace } from "@/components/design-system-workspace";
import { LabToday } from "@/components/lab/lab-today";
import { LabTopic } from "@/components/lab/lab-topic";
import { EngineeringLearn } from "@/components/engineering/learn";
import { TermsPage } from "@/components/terms/terms-page";
import { EngineeringEvidence } from "@/components/engineering/evidence";
import { EngineeringOverview } from "@/components/engineering/overview";
import { EngineeringProfile } from "@/components/engineering/profile";
import { capabilityRows, nextRequirement, pathChapters } from "@/features/engineering-lab/capabilities";
import { assessorModes, careers, findTopic, labsForTopic, placeOf, topicMap } from "@/features/engineering-lab/curriculum";
import { nextStepFromView } from "@/features/engineering-lab/next-step";
import { previewDaily, previewEvidence, previewLearner, previewProfile, previewRun, previewToday, previewTopic } from "@/features/engineering-lab/preview";
import { LabPractice } from "@/components/lab/practice/lab-practice";
import { LabHomeExplore, type Direction } from "@/components/lab/explore/lab-home-explore";
import { tracks, type Track } from "@/components/lab/explore/road-tracks";
import { ProfileExplore, type ProfileDirection, type ProfileTab } from "@/components/lab/explore/profile-explore";
import { LabAssessment } from "@/components/lab/assessment/lab-assessment";
import { LabProfile } from "@/components/lab/profile/lab-profile";
import { WritingStudioPreview } from "@/components/writing-studio-preview";
import { LabUiPreview } from "@/components/lab-ui-preview/lab-ui-preview";

export default async function DesignPreview({ searchParams }: { searchParams: Promise<{ view?: string; topic?: string; screen?: string; step?: string; d?: string; t?: string; tab?: string; pane?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { view, topic: topicParam, screen: screenParam, step: stepParam, d: directionParam, t: trackParam, tab: tabParam, pane: paneParam } = await searchParams;

  if (view === "resume") {
    return <ResumeWorkspace email="preview@example.invalid" selection={null} file={null} error={null} previewUrl={null} canAsk={false} preview />;
  }
  if (view === "skills") {
    return <SkillsWorkspace email="preview@example.invalid" skills={[]} preview />;
  }
  if (view === "memory") {
    return <ProjectMemoryPreview />;
  }
  if (view === "lab") {
    const today = previewToday();
    return <LabToday email="preview@example.invalid" today={today} next={today.plan ? nextStepFromView(today.plan, previewTopic(today.plan.topicId)) : null} profile={previewProfile(screenParam === "start" ? "none" : "done")} daily={null} />;
  }
  if (view === "lab-explore") {
    const today = previewToday();
    const direction: Direction = directionParam === "route" || directionParam === "skyline" ? directionParam : "report";
    const next = today.plan ? nextStepFromView(today.plan, previewTopic(today.plan.topicId)) : null;
    const track = (tracks.find((item) => item.id === trackParam)?.id ?? "rail") as Track;
    return <LabHomeExplore direction={direction} track={track} data={{ profile: previewProfile(), today, next, states: previewLearner().states }} />;
  }
  if (view === "profile-explore") {
    const direction: ProfileDirection = directionParam === "tabs" || directionParam === "compare" || directionParam === "workbench-app" ? directionParam : "workbench";
    const pane = (["shape", "levels", "roles", "radar", "history", "definitions"].includes(paneParam ?? "") ? paneParam : "shape") as "shape";
    const tab: ProfileTab = ["direction", "levels", "radar", "assessed", "definitions"].includes(tabParam ?? "") ? tabParam as ProfileTab : "direction";
    return <ProfileExplore profile={previewProfile()} states={previewLearner().states} direction={direction} tab={tab} pane={pane} />;
  }
  if (view === "lab-profile") {
    return <LabProfile email="preview@example.invalid" view={previewProfile()} />;
  }
  if (view === "lab-practice") {
    return <LabPractice email="preview@example.invalid" daily={screenParam === "start" ? null : previewDaily()} />;
  }
  if (view === "lab-assessment") {
    const profile = previewProfile("in_progress");
    return <LabAssessment email="preview@example.invalid" intake={screenParam === "intake" ? null : profile.intake} conversation={[]} run={screenParam === "intake" ? null : previewRun()} focus={null} baselineDone={false} />;
  }
  if (view === "terms") {
    const savedAt = new Date().toISOString();
    return <TermsPage email="preview@example.invalid" preview terms={[
      { id: "t1", term: "microtask", meaning: "A small job the runtime runs right after the current code finishes and before the next task, such as a promise callback.", source: { title: "MDN: Using microtasks", url: "https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide" }, foundIn: "Engineering Lab · Event loop, tasks and microtasks", foundAt: "/design-preview?view=lab-topic", savedAt },
      { id: "t2", term: "idempotent", meaning: "Safe to repeat: doing it twice has the same effect as doing it once.", source: null, foundIn: "Engineering Lab · Idempotent create requests", foundAt: "/design-preview?view=lab-topic", savedAt },
    ]} />;
  }
  if (view === "engineering") {
    const today = previewToday();
    const profile = previewProfile(screenParam === "start" ? "none" : "done");
    return <EngineeringOverview email="preview@example.invalid" today={today} next={today.plan ? nextStepFromView(today.plan, previewTopic(today.plan.topicId)) : null} profile={profile} daily={screenParam === "start" ? null : previewDaily()} />;
  }
  if (view === "engineering-profile") {
    const profile = previewProfile(screenParam === "start" ? "none" : "done");
    const nodirection = screenParam === "nodirection";
    const roleId = nodirection ? null : profile.direction;
    const rows = capabilityRows({ careers, map: topicMap, progress: profile.progress, states: profile.chapterStates, baselineStates: profile.baselineChapterStates, roleId });
    return <EngineeringProfile email="preview@example.invalid" view={{ ...profile, direction: roleId }} rows={rows} next={nextRequirement(rows, roleId)} evidence={previewEvidence().recent} />;
  }
  if (view === "engineering-evidence") {
    const { view: evidence } = previewEvidence();
    return <EngineeringEvidence email="preview@example.invalid" view={screenParam === "withheld" ? { ...evidence, result: null, question: { ...evidence.question, expectedOutput: null } } : evidence} />;
  }
  if (view === "engineering-learn") {
    const assessable = topicMap.topics.filter((topic) => assessorModes(topic).length > 0).map((topic) => topic.id);
    const today = previewToday();
    const upNext = today.plan ? { topicId: today.plan.topicId, title: findTopic(today.plan.topicId)?.title ?? today.plan.topicId, step: "learn" as const, reason: today.plan.reason } : null;
    return <EngineeringLearn email="preview@example.invalid" map={topicMap} progress={previewLearner().progress} assessable={assessable} path={pathChapters(careers, "fullstack-applied-ai")} upNext={upNext} />;
  }
  if (view === "lab-course") {
    const assessable = topicMap.topics.filter((topic) => assessorModes(topic).length > 0).map((topic) => topic.id);
    return <EngineeringLearn email="preview@example.invalid" map={topicMap} progress={previewToday().progress} assessable={assessable} />;
  }
  if (view === "lab-topic") {
    const topic = findTopic(topicParam ?? "js.event_loop") ?? findTopic("js.event_loop")!;
    const initialStep = (["learn", "practice", "lab", "check"] as const).find((item) => item === stepParam);
    return <LabTopic email="preview@example.invalid" topic={topic} view={previewTopic(topic.id)} labs={labsForTopic(topic.id)} skipLesson={false} place={placeOf(topic)} initialStep={initialStep} />;
  }
  if (view === "lab-ui") {
    const screen = (["today", "course", "topic", "terms"] as const).find((item) => item === screenParam) ?? "today";
    const step = (["learn", "practice", "lab", "check"] as const).find((item) => item === stepParam) ?? "learn";
    return <LabUiPreview initialScreen={screen} initialStep={step} />;
  }
  if (view === "design") {
    return <DesignSystemWorkspace email="preview@example.invalid" preview />;
  }
  if (view === "writing") {
    return <WritingStudioPreview />;
  }

  return (
    <WorkspaceShell email="preview@example.invalid" active="resume" preview>
      <div className="mx-auto w-full max-w-[1320px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <div className="mb-8 border-b border-border pb-8 sm:mb-10">
          <p className="mb-3 text-[11px] font-bold tracking-[0.16em] text-muted-foreground">APP SHELL PREVIEW</p>
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-[-0.06em] sm:text-5xl">One place to find your work.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">A quiet workspace with modules and their sections in one spacious sidebar, leaving room for the task at hand.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,1fr)]">
          <article className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <p className="mb-3 text-[11px] font-bold tracking-[0.16em] text-muted-foreground">DESIGN DIRECTION · DRAFT</p>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.05em] sm:text-3xl">A floating sidebar for Ken OS</h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">Modules and their sections sit together in a familiar, grouped navigation. The main content keeps its focus while the sidebar has room to breathe.</p>
            <div className="mt-8 border-t border-border pt-7">
              <h3 className="font-display text-xl font-semibold tracking-[-0.04em]">What this establishes</h3>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
                <li>A cool light palette with one indigo action</li>
                <li>Readable, editorial content density</li>
                <li>One navigation system for present and future modules</li>
              </ul>
            </div>
          </article>
          <aside className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <p className="mb-5 text-[11px] font-bold tracking-[0.16em] text-muted-foreground">CURRENT MODULES</p>
            <div className="space-y-3 text-sm"><p>Resume hub</p><p>Agent skills</p></div>
          </aside>
        </div>
      </div>
    </WorkspaceShell>
  );
}

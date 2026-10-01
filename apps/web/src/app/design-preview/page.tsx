import { notFound } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { ResumeWorkspace } from "@/components/resume-workspace";
import { SkillsWorkspace } from "@/components/skills-workspace";
import { ProjectMemoryPreview } from "@/components/project-memory-preview";
import { DesignSystemWorkspace } from "@/components/design-system-workspace";
import { LabToday } from "@/components/lab/lab-today";
import { LabTopic } from "@/components/lab/lab-topic";
import { findTopic, labsForTopic } from "@/features/engineering-lab/curriculum";
import { previewToday, previewTopic } from "@/features/engineering-lab/preview";
import { WritingStudioPreview } from "@/components/writing-studio-preview";

export default async function DesignPreview({ searchParams }: { searchParams: Promise<{ view?: string; topic?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { view, topic: topicParam } = await searchParams;

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
    return <LabToday email="preview@example.invalid" today={previewToday()} />;
  }
  if (view === "lab-topic") {
    const topic = findTopic(topicParam ?? "js.event_loop") ?? findTopic("js.event_loop")!;
    return <LabTopic email="preview@example.invalid" topic={topic} view={previewTopic(topic.id)} labs={labsForTopic(topic.id)} skipLesson={false} />;
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
                <li>A warm monochrome palette with restrained emphasis</li>
                <li>Readable, editorial content density</li>
                <li>One navigation system for present and future modules</li>
              </ul>
            </div>
          </article>
          <aside className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <p className="mb-5 text-[11px] font-bold tracking-[0.16em] text-muted-foreground">CURRENT MODULES</p>
            <div className="space-y-3 text-sm"><p>Resume hub</p><p>Agent skills</p></div>
            <p className="mt-8 border-t border-border pt-5 text-xs leading-5 text-muted-foreground">Project Memory is not implemented yet.</p>
          </aside>
        </div>
      </div>
    </WorkspaceShell>
  );
}

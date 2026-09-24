import { SkillManager } from "@/components/skill-manager";
import { WorkspaceShell } from "@/components/workspace-shell";
import type { StoredSkill } from "@/lib/skills";

export function SkillsWorkspace({ email, skills, preview = false }: { email: string; skills: StoredSkill[]; preview?: boolean }) {
  return (
    <WorkspaceShell email={email} active="skills" preview={preview}>
      <div className="mx-auto w-full max-w-[1320px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <div className="mb-8 flex items-end justify-between gap-6 border-b border-border pb-8 sm:mb-10">
          <div>
            <p className="mb-3 text-[11px] font-bold tracking-[0.16em] text-muted-foreground">AGENT CAPABILITIES</p>
            <h1 className="font-display text-4xl font-bold tracking-[-0.06em] sm:text-5xl">Skills<span className="text-muted-foreground">.</span></h1>
            <p className="mt-3 max-w-2xl text-base leading-6 text-muted-foreground">Upload reusable instructions, review them, then enable a version for the resume assistant.</p>
          </div>
          <div className="hidden shrink-0 font-display text-3xl font-semibold sm:block">02 <span className="font-sans text-[10px] tracking-[0.14em] text-muted-foreground">/ MODULE</span></div>
        </div>
        <SkillManager skills={skills} />
      </div>
    </WorkspaceShell>
  );
}

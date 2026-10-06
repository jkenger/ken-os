import { SkillManager } from "@/components/skill-manager";
import { WorkspaceShell } from "@/components/workspace-shell";
import type { StoredSkill } from "@/lib/skills";

export function SkillsWorkspace({ email, skills, preview = false }: { email: string; skills: StoredSkill[]; preview?: boolean }) {
  return (
    <WorkspaceShell email={email} active="skills" preview={preview}>
      <div className="mx-auto w-full max-w-[1320px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <div className="mb-8 flex items-end justify-between gap-6 border-b border-border pb-8 sm:mb-10">
          <div>
            <h1 className="text-[28px] font-[750] leading-[1.25] tracking-[-0.8px] md:text-[30px] xl:text-[36px] xl:tracking-[-1.3px]">Skills</h1>
          </div>
        </div>
        <SkillManager skills={skills} />
      </div>
    </WorkspaceShell>
  );
}

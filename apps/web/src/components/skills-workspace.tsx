import { SkillManager } from "@/components/skill-manager";
import { WorkspaceShell } from "@/components/workspace-shell";
import type { StoredSkill } from "@/lib/skills";

export function SkillsWorkspace({ email, skills }: { email: string; skills: StoredSkill[] }) {
  return (
    <WorkspaceShell email={email} active="skills">
      <div className="mx-auto w-full max-w-[1320px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <div className="mb-6 flex items-end justify-between gap-6 sm:mb-8">
          <div>
            <h1 className="text-[30px] font-[750] leading-[1.1] tracking-[-0.035em] md:text-[34px] xl:text-[40px] xl:leading-[1.05]">Skills</h1>
          </div>
        </div>
        <SkillManager skills={skills} />
      </div>
    </WorkspaceShell>
  );
}

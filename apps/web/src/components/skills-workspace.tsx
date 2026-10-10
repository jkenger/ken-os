import { SkillManager } from "@/components/skill-manager";
import { WorkspaceShell } from "@/components/workspace-shell";
import type { StoredSkill } from "@/lib/skills";

export function SkillsWorkspace({ email, skills }: { email: string; skills: StoredSkill[] }) {
  return (
    <WorkspaceShell email={email} active="skills">
      <div className="mx-auto w-full max-w-330 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <div className="mb-6 flex items-end justify-between gap-6 sm:mb-8">
          <div>
            <h1 className="text-3xl font-bold leading-none tracking-tight md:text-4xl xl:text-4xl xl:leading-none">Skills</h1>
          </div>
        </div>
        <SkillManager skills={skills} />
      </div>
    </WorkspaceShell>
  );
}

import { redirect } from "next/navigation";
import { SkillManager } from "@/components/skill-manager";
import { WorkspaceShell } from "@/components/workspace-shell";
import { getSession } from "@/lib/session";
import { listSkills } from "@/lib/skills";

export const dynamic = "force-dynamic";

export default async function SkillsPage() {
  const session = await getSession();
  if (!session) redirect("/");
  const skills = await listSkills(session.userId);
  return (
    <WorkspaceShell email={session.email} active="skills">
      <div className="content">
        <div className="page-heading">
          <div>
            <p className="kicker">AGENT CAPABILITIES</p>
            <h1>Skills<span className="heading-dot">.</span></h1>
            <p className="intro">Upload reusable instructions, review them, then enable a version for the resume assistant.</p>
          </div>
          <div className="heading-number">02 <span>/ MODULE</span></div>
        </div>
        <SkillManager skills={skills} />
      </div>
    </WorkspaceShell>
  );
}

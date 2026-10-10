import { SkillsWorkspace } from "@/components/skills-workspace";
import { requireSession } from "@/lib/session";
import { listSkills } from "@/lib/skills";

export const dynamic = "force-dynamic";

export default async function SkillsPage() {
  const session = await requireSession("/skills");
  const skills = await listSkills(session.userId);
  return <SkillsWorkspace email={session.email} skills={skills} />;
}

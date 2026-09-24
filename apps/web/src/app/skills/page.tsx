import { redirect } from "next/navigation";
import { SkillsWorkspace } from "@/components/skills-workspace";
import { getSession } from "@/lib/session";
import { listSkills } from "@/lib/skills";

export const dynamic = "force-dynamic";

export default async function SkillsPage() {
  const session = await getSession();
  if (!session) redirect("/");
  const skills = await listSkills(session.userId);
  return <SkillsWorkspace email={session.email} skills={skills} />;
}

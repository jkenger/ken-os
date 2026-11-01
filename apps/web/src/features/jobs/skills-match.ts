function normalize(skill: string): string {
  return skill.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Compares a posting's own skill tags against the Profile's skills (docs/mockups/job-finder.md, "Redesign" --
 *  the detail page's Skills matching row). Normalizes case and punctuation on both sides (freehire's kebab-case
 *  "ci-cd" against the Profile's own free-text "CI/CD") rather than requiring an exact string match. No AI call:
 *  the comparison is a plain set membership check. */
export function matchSkills(postingSkills: string[], profileSkills: string[]): { skill: string; inProfile: boolean }[] {
  const normalizedProfile = new Set(profileSkills.map(normalize));
  return postingSkills.map((skill) => ({ skill, inProfile: normalizedProfile.has(normalize(skill)) }));
}

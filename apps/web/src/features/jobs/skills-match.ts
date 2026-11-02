import { formatSkillName, normalizeSkill, skillEntry } from "./skills-dictionary";

export type SkillMatch =
  | { skill: string; status: "have" }
  | { skill: string; status: "related"; relatedTo: string[] }
  | { skill: string; status: "missing" };

/** Compares a posting's own skill tags against the Profile's skills (docs/mockups/job-finder.md, "Redesign" --
 *  the detail page's Skills matching row), three ways: `have` (the same skill, via `skills-dictionary`'s alias
 *  table or an exact normalized match for anything the dictionary doesn't know), `related` (a different skill in
 *  the same dictionary family -- Vue credited against a Profile that lists React), or `missing` (neither). `have`
 *  always wins over `related` when a posting skill matches one Profile skill exactly and shares a family with
 *  another. No AI call: every comparison is a plain lookup. */
export function matchSkills(postingSkills: string[], profileSkills: string[]): SkillMatch[] {
  const normalizedProfile = new Map(profileSkills.map((skill) => [normalizeSkill(skill), skill]));

  return postingSkills.map((postingSkill) => {
    const displayName = formatSkillName(postingSkill);
    const slug = normalizeSkill(postingSkill);

    if (normalizedProfile.has(slug)) return { skill: displayName, status: "have" };

    const family = skillEntry(postingSkill)?.family;
    if (family) {
      const relatedTo = profileSkills.filter((profileSkill) => skillEntry(profileSkill)?.family === family);
      if (relatedTo.length > 0) return { skill: displayName, status: "related", relatedTo };
    }

    return { skill: displayName, status: "missing" };
  });
}

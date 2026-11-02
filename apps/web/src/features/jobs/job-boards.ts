/** The common ATS platforms and job boards freehire's own `source` field names, confirmed against freehire's
 *  live API this session (greenhouse, workday, successfactors, smartrecruiters, adzuna, jobleads, jobstreet,
 *  naukri, telegram, whatjobs, eures, mycareersfuture, jibe, eightfold, adp, oracle, avature, phenom, comeet --
 *  far more exist than this covers; unknown ones fall back to a title-cased guess rather than erroring. */
const KNOWN_BOARDS: Record<string, string> = {
  greenhouse: "Greenhouse",
  workday: "Workday",
  successfactors: "SuccessFactors",
  smartrecruiters: "SmartRecruiters",
  adzuna: "Adzuna",
  jobleads: "JobLeads",
  jobstreet: "JobStreet",
  naukri: "Naukri",
  telegram: "Telegram",
  whatjobs: "WhatJobs",
  eures: "EURES",
  mycareersfuture: "MyCareersFuture",
  jibe: "Jibe",
  eightfold: "Eightfold",
  adp: "ADP",
  oracle: "Oracle",
  avature: "Avature",
  phenom: "Phenom",
  comeet: "Comeet",
};

function titleCaseFallback(slug: string): string {
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** The display name for freehire's own `source` field -- the ATS or job board it actually pulled a posting from
 *  (docs/mockups/Jobs redesign.html, "Desktop / Job detail" -- the "Sourced from" line). freehire runs several
 *  country editions of the same board as "board-XX" ("whatjobs-uk", "whatjobs-fi"); those keep the base board's
 *  proper name with the country code shown alongside, rather than reading as an unrelated board. */
export function formatBoardName(rawSlug: string): string {
  const slug = rawSlug.trim().toLowerCase();
  if (KNOWN_BOARDS[slug]) return KNOWN_BOARDS[slug];

  const regional = slug.match(/^([a-z]+)-([a-z]{2})$/);
  if (regional) {
    const [, base, country] = regional;
    if (base && KNOWN_BOARDS[base]) return `${KNOWN_BOARDS[base]} (${country!.toUpperCase()})`;
  }

  return titleCaseFallback(slug);
}

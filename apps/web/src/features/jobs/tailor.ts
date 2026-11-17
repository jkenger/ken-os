import type { PaperSize, ProfileDetails, ResumeTemplate } from "@ken-os/domain";
import type { TailoredResumeFields } from "./store";

// Builds and stores a resume tailored to one posting (docs/architecture/cv-tailoring.md). Dependencies are
// injected so this stays testable without a real AI call, PDF render or database, same shape as `process.ts`'s
// `processPostings`/`scorePostings`.

type Selection = { experience: number[]; skills: number[]; projects: number[] };

type TailorablePosting = {
  title: string;
  company: string;
  fullDescription: string | null;
  summary: string | null;
};

type TailorableProfile = {
  details: ProfileDetails;
  resume: { template: ResumeTemplate; paper: PaperSize };
};

/** Keeps only the positions that exist in `entries`, in the order given, dropping anything out of bounds --
 *  a model can only ever point at what it was actually shown, never invent a new one. */
function pick<T>(entries: T[], indices: number[]): T[] {
  return indices.filter((index) => index >= 0 && index < entries.length).map((index) => entries[index]);
}

function isEmptySelection(selection: Selection): boolean {
  return selection.experience.length === 0 && selection.skills.length === 0 && selection.projects.length === 0;
}

/** Reorders/filters Experience, Skills and Projects to lead with what `selection` says is relevant; every other
 *  field passes through unchanged. An empty selection on all three sections is the no-relevant-content case: the
 *  full Profile, unfiltered, in its original order (never a thin result). */
export function buildTailoredProfile(details: ProfileDetails, selection: Selection): ProfileDetails {
  if (isEmptySelection(selection)) return details;
  return {
    ...details,
    experience: pick(details.experience, selection.experience),
    skills: pick(details.skills, selection.skills),
    projects: pick(details.projects, selection.projects),
  };
}

export async function tailorResume(params: {
  userId: string;
  postingId: string;
  getProfile: (userId: string) => Promise<TailorableProfile>;
  getPosting: (userId: string, postingId: string) => Promise<TailorablePosting | null>;
  selectEntries: (input: {
    profile: ProfileDetails;
    title: string;
    company: string;
    text: string;
  }) => Promise<Selection & { promptVersion: string; model: string }>;
  render: (details: ProfileDetails, template: ResumeTemplate, paper: PaperSize) => Promise<Buffer>;
  save: (postingId: string, userId: string, fields: TailoredResumeFields) => Promise<void>;
}): Promise<void> {
  const profile = await params.getProfile(params.userId);
  const posting = await params.getPosting(params.userId, params.postingId);
  if (!posting) throw new Error("Posting not found");

  const text = posting.fullDescription ?? posting.summary ?? "";
  const selection = await params.selectEntries({
    profile: profile.details,
    title: posting.title,
    company: posting.company,
    text,
  });

  const filtered = buildTailoredProfile(profile.details, selection);
  // Render before saving: a throw here never touches a previously saved row for this posting (load-bearing for
  // regenerate -- see docs/architecture/cv-tailoring.md, "Module: building and storing the tailored resume").
  const data = await params.render(filtered, profile.resume.template, profile.resume.paper);

  await params.save(params.postingId, params.userId, {
    data,
    size: data.length,
    selection: { experience: selection.experience, skills: selection.skills, projects: selection.projects },
    promptVersion: selection.promptVersion,
    model: selection.model,
  });
}

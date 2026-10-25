import { Agent, getDefaultModel, run } from "@openai/agents";
import { normalizeProfile, type ProfileDetails } from "@ken-os/domain";
import { PROFILE_READ_RULES, profileFieldsSchema } from "./autofill";

// Reads a resume's text into Profile fields for the owner to review. It copies, it never writes new content.
// Spec: docs/product/profile-resume.md.

export const PROFILE_IMPORT_PROMPT_VERSION = "profile-import-v1";

/** The longest resume text sent to the model. Real resumes are far shorter. */
const MAX_TEXT = 40_000;

const instructions = `You copy one resume into structured fields for its owner to review. You are a careful data entry clerk, not a writer.

${PROFILE_READ_RULES}`;

/** Reads resume text into a Profile draft. The draft is cleaned in `import` mode, so overlong text is cut and dates the
 *  model got wrong are dropped rather than failing the import. */
export async function importProfile(resumeText: string): Promise<{ draft: ProfileDetails; model: string }> {
  const agent = new Agent({ name: "Profile import", instructions, outputType: profileFieldsSchema });
  const result = await run(agent, JSON.stringify({ resume: resumeText.slice(0, MAX_TEXT) }), { maxTurns: 2 });
  if (!result.finalOutput) throw new Error("The import returned no fields.");
  const draft = normalizeProfile(
    { ...result.finalOutput, local: { ...result.finalOutput.local, enabled: false } },
    "import",
  );
  return { draft, model: getDefaultModel() };
}

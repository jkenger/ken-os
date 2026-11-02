const CODE_PATTERN = /^[a-zA-Z]{2}$/;
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

/** A two-letter ISO code's flag, built from the two Unicode regional-indicator letters rather than a hand-kept
 *  table, so every code `job_postings.countries` can ever hold renders correctly (docs/mockups/job-finder.md,
 *  "Redesign" -- Location/Country avatar groups). An unrecognized shape returns the code itself, uppercased,
 *  never a guessed flag. */
export function countryFlag(code: string): string {
  const trimmed = code.trim();
  if (!CODE_PATTERN.test(trimmed)) return trimmed.toUpperCase();
  return String.fromCodePoint(...[...trimmed.toUpperCase()].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65));
}

/** The country name for a two-letter ISO code, via the platform's own `Intl.DisplayNames` rather than a hand-kept
 *  table. An unrecognized code returns the code itself, never a guess. */
export function countryName(code: string): string {
  try {
    return regionNames.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

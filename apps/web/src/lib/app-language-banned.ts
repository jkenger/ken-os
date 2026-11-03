/**
 * Phrases that break the app language rule (docs/product/app-language.md).
 * Matching is a substring match that starts on a word boundary.
 */
export type BannedPhrase = {
  phrase: string;
  ignoreCase?: boolean;
  /** Only checked in `.tsx` screen code, never in API routes, where stored values keep their names. */
  screenOnly?: boolean;
  /** Allowed as the value of these JSX attributes, such as scripted Guide openers. */
  exceptAttributes?: string[];
  /** Allowed in these files, relative to `apps/web/src`. */
  exceptFiles?: string[];
};

export const bannedPhrases: BannedPhrase[] = [
  { phrase: "Ready when you are" },
  { phrase: "Pick up where you left off" },
  { phrase: "Hi.", exceptAttributes: ["opener"] },
  { phrase: "resume agent", ignoreCase: true },
  { phrase: "Resume hub" },
  { phrase: "Agent skills" },
  { phrase: "AGENT CAPABILITIES" },
  { phrase: "Could not" },
  { phrase: "Request failed" },
  { phrase: "Invalid origin" },
  { phrase: "Sign in required" },
  { phrase: "screening", ignoreCase: true },
  { phrase: "receipt", ignoreCase: true, screenOnly: true },
  { phrase: "..." },
  // Retired by the Engineering rebuild (docs/architecture/engineering-rebuild.md, section 2 and section 8).
  { phrase: "Known", screenOnly: true },
  { phrase: "Not assessed", ignoreCase: true, screenOnly: true },
  { phrase: "Needs another look", ignoreCase: true, screenOnly: true },
  { phrase: "Placement check", ignoreCase: true, screenOnly: true },
  { phrase: "Checkpoint", screenOnly: true },
  { phrase: "Baseline", screenOnly: true },
  { phrase: "Estimate", ignoreCase: true, screenOnly: true },
  { phrase: "Guide", screenOnly: true },
  { phrase: "Not yet junior", ignoreCase: true, screenOnly: true },
];

import { SOURCE_DOMAINS } from "./engineering-lab/sources";

// Term lookup: select a word on any Ken OS page, get a short meaning and one trusted link, save it to Terms.

/** Every site the Researcher trusts. A lookup's link must come from one of these. */
export const TRUSTED_LOOKUP_DOMAINS = [...new Set(Object.values(SOURCE_DOMAINS).flat())];

/** Lookups the AI may answer per UTC day. Separate from lesson generation, so a reading day can't block lessons. */
export const TERM_LOOKUP_LIMIT = 40;

/** Longest selection a lookup accepts. Longer text is a passage, not a term. */
export const TERM_MAX_LENGTH = 60;

export interface TermAnswer {
  term: string;
  meaning: string;
  source: { title: string; url: string } | null;
}

/** One saved term per spelling: case, spacing and trailing punctuation don't make a new one. */
export function termKey(term: string) {
  return term
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^[\s"'`([{]+|[\s"'`)\]}.,:;!?]+$/g, "");
}

export interface TermMatch {
  /** Which of the texts the match is in. */
  index: number;
  start: number;
  end: number;
  /** The saved term's key, from termKey. */
  key: string;
}

/**
 * Where saved terms first appear in a page's texts, given in reading order. Whole words only, any case, and a plural
 * ("closures", "classes") matches its saved singular. Each term is matched once, at its first appearance; where saved
 * terms overlap ("call stack" and "stack"), the longer one wins.
 */
export function firstTermMatches(texts: readonly string[], keys: readonly string[]): TermMatch[] {
  const wanted = [...new Set(keys.map(termKey).filter(Boolean))].sort((a, b) => b.length - a.length);
  if (!wanted.length) return [];
  const words = wanted.map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+")).join("|");
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}_])(${words})(?:e?s)?(?![\\p{L}\\p{N}_])`, "giu");
  const found = new Set<string>();
  const matches: TermMatch[] = [];
  texts.forEach((text, index) => {
    for (const match of text.matchAll(pattern)) {
      const key = match[1].toLowerCase().replace(/\s+/g, " ");
      if (found.has(key)) continue;
      found.add(key);
      matches.push({ index, start: match.index, end: match.index + match[0].length, key });
    }
  });
  return matches;
}

/** True only for an https link on a trusted site or one of its subdomains. */
export function isTrustedSourceUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  return TRUSTED_LOOKUP_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

/** Keeps an AI answer inside the rules: a short meaning, and a link only if it is trusted. */
export function finalizeTermAnswer(
  selected: string,
  draft: { term: string; meaning: string; sourceTitle: string | null; sourceUrl: string | null },
): TermAnswer {
  const term = draft.term.trim().slice(0, TERM_MAX_LENGTH) || selected.trim();
  const meaning = draft.meaning.trim().replace(/\s+/g, " ").slice(0, 600);
  const source =
    draft.sourceUrl && isTrustedSourceUrl(draft.sourceUrl)
      ? {
          title: (draft.sourceTitle ?? "").trim().slice(0, 120) || new URL(draft.sourceUrl).hostname,
          url: draft.sourceUrl,
        }
      : null;
  return { term, meaning, source };
}

/** A same-site path to link back to. Anything else, such as another site or a script URL, becomes the home page. */
export function safeReturnPath(value: string) {
  return /^\/(?!\/)[\w\-./?=&%#:+~]*$/.test(value) ? value.slice(0, 500) : "/";
}

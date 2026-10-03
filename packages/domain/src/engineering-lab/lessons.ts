import type { SourcePacket } from "./sources";
import type { PredictItem } from "./types";

/** A short question answered in your head; the answer is revealed, never graded. */
export interface ThinkItem {
  kind: "think";
  prompt: string;
  answer: string;
}

/** A prediction checked by running the code in the browser. Recorded as lesson practice. */
export interface PracticePredict extends Omit<PredictItem, "mode"> {
  kind: "predict";
}

export type PracticeItem = ThinkItem | PracticePredict;

export interface LessonSections {
  whyItMatters: string;
  whatYouKnow: string;
  theGap: string;
  theory: string;
  mentalModel: string;
  workedExample: { code: string; walkthrough: string };
}

/** An optional extra section under the core lesson: an edge case, what happens underneath, or a real bug. */
export interface DeeperSection {
  title: string;
  body: string;
}

export interface LessonDraft {
  sections: LessonSections;
  /** Optional, collapsed under the core lesson. Lessons written before tutor-v3 have none. */
  deeper?: DeeperSection[];
  practice: PracticeItem[];
  citations: { claim: string; sourceUrl: string }[];
  noteSuggestions: string[];
}

export interface LessonSnapshot extends LessonDraft {
  topicId: string;
  version: number;
  sourcePacketId: string;
  promptVersion: string;
  model: string;
  labIds: string[];
  /** Citations the Tutor gave that were not in the packet, kept visible. */
  rejected: string[];
}

/** Keeps only citations that point at a source in the packet the lesson was built from. */
export function finalizeLesson(
  draft: LessonDraft,
  packet: Pick<SourcePacket, "sources">,
  meta: Omit<LessonSnapshot, keyof LessonDraft | "rejected">,
): LessonSnapshot {
  const allowed = new Set(packet.sources.map((source) => source.url));
  const rejected: string[] = [];
  const citations = draft.citations.filter((citation) => {
    const kept = allowed.has(citation.sourceUrl);
    if (!kept) rejected.push(`Citation outside the source packet: ${citation.sourceUrl}`);
    return kept;
  });
  if (!citations.length) throw new Error("The lesson cited none of its sources.");
  const practice = draft.practice.filter((item) => item.prompt.trim() && (item.kind === "think" ? item.answer.trim() : item.code.trim())).slice(0, 6);
  const deeper = (draft.deeper ?? []).filter((item) => item.title.trim() && item.body.trim()).slice(0, 4);
  return { ...meta, ...draft, deeper, practice, citations, noteSuggestions: draft.noteSuggestions.slice(0, 6), rejected };
}

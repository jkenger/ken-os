import { isTrustedSourceUrl } from "../terms";
import { CLAUDE_LIMITS } from "./exercises";
import type { SourcePacket } from "./sources";
import type { TopicQuestion } from "./types";

// The lesson format. Spec: docs/architecture/engineering-rebuild.md, section 3 (Topic, Learn) and section 4.

export const LESSON_BLOCK_KINDS = ["code", "formula", "rule"] as const;
export type LessonBlockKind = (typeof LESSON_BLOCK_KINDS)[number];

/** The one formula, code or rule block, with a line on how to read it. */
export interface LessonBlock {
  kind: LessonBlockKind;
  content: string;
  note: string;
}

export interface LessonSource {
  title: string;
  url: string;
}

/** What a lesson says, in the order it is shown. */
export interface LessonContent {
  /** A short heading for the core idea. */
  heading: string;
  /** Two or three sentences on the core idea. */
  body: string;
  mentalModel: string;
  block: LessonBlock;
  /** A product example. */
  example: string;
  /** Optional, folded: one extra section for the curious. */
  deeper: { title: string; body: string } | null;
  /** What you'll prove: exactly 3 short bullets from the topic's assessment points. */
  prove: string[];
  sources: LessonSource[];
}

/** What the Tutor returns: the content without sources, plus the packet URLs each key claim rests on. */
export interface LessonDraft extends Omit<LessonContent, "sources"> {
  citations: { claim: string; sourceUrl: string }[];
}

export interface LessonSnapshot extends LessonContent {
  topicId: string;
  version: number;
  /** Null for a hand-written lesson. */
  sourcePacketId: string | null;
  promptVersion: string;
  model: string;
  /** Citations the Tutor gave that were not in the packet, kept visible. */
  rejected: string[];
}

function clean(text: string) {
  return text.trim();
}

/** Keeps only citations that point at a source in the packet, and turns them into the lesson's sources. */
export function finalizeLesson(draft: LessonDraft, packet: Pick<SourcePacket, "sources">, meta: Pick<LessonSnapshot, "topicId" | "version" | "sourcePacketId" | "promptVersion" | "model">): LessonSnapshot {
  const allowed = new Map(packet.sources.map((source) => [source.url, source.title]));
  const rejected: string[] = [];
  const cited = new Set<string>();
  for (const citation of draft.citations) {
    if (allowed.has(citation.sourceUrl)) cited.add(citation.sourceUrl);
    else rejected.push(`Citation outside the source packet: ${citation.sourceUrl}`);
  }
  if (!cited.size) throw new Error("The lesson cited none of its sources.");
  const prove = draft.prove.map(clean).filter(Boolean).slice(0, 3);
  if (prove.length !== 3) throw new Error("The lesson needs exactly 3 things to prove.");
  if (![draft.heading, draft.body, draft.mentalModel, draft.block.content, draft.example].every((text) => clean(text))) throw new Error("The lesson is missing a part.");
  const deeper = draft.deeper && clean(draft.deeper.title) && clean(draft.deeper.body) ? { title: clean(draft.deeper.title), body: clean(draft.deeper.body) } : null;
  return {
    ...meta,
    heading: clean(draft.heading),
    body: clean(draft.body),
    mentalModel: clean(draft.mentalModel),
    block: { kind: draft.block.kind, content: draft.block.content.replace(/\s+$/, ""), note: clean(draft.block.note) },
    example: clean(draft.example),
    deeper,
    prove,
    sources: [...cited].map((url) => ({ title: allowed.get(url)!, url })),
    rejected,
  };
}

/**
 * Keeps a lesson Claude saved inside the lesson rules: every part present, exactly 3 things to prove, at most
 * CLAUDE_LIMITS.lesson characters, and only sources on the Researcher's trusted sites. Others are dropped and listed in
 * `rejected`, which is reported back to Claude.
 */
export function finalizeClaudeLesson(input: LessonContent, meta: Pick<LessonSnapshot, "topicId" | "version">): LessonSnapshot {
  const prove = input.prove.map(clean).filter(Boolean);
  if (prove.length !== 3) throw new Error("A lesson needs exactly 3 things to prove");
  if (![input.heading, input.body, input.mentalModel, input.block.content, input.block.note, input.example].every((part) => clean(part))) {
    throw new Error("A lesson needs a heading, body, mental model, block with a note, and a product example");
  }
  const deeper = input.deeper && clean(input.deeper.title) && clean(input.deeper.body) ? { title: clean(input.deeper.title), body: clean(input.deeper.body) } : null;
  const size = [input.heading, input.body, input.mentalModel, input.block.content, input.block.note, input.example, deeper?.title ?? "", deeper?.body ?? "", ...prove]
    .reduce((sum, part) => sum + part.length, 0);
  if (size > CLAUDE_LIMITS.lesson) throw new Error(`Keep the lesson under ${CLAUDE_LIMITS.lesson} characters (it has ${size})`);
  const rejected: string[] = [];
  const sources: LessonSource[] = [];
  for (const source of input.sources) {
    const url = source.url.trim();
    if (!isTrustedSourceUrl(url)) rejected.push(`Not on a trusted site: ${url}`);
    else if (!sources.some((item) => item.url === url)) sources.push({ title: clean(source.title).slice(0, 200) || new URL(url).hostname, url });
  }
  if (!sources.length) throw new Error(`A lesson needs at least one source on a trusted site.${rejected.length ? ` Dropped: ${rejected.join("; ")}` : ""}`);
  return {
    ...meta, sourcePacketId: null, promptVersion: "claude", model: "claude",
    heading: clean(input.heading), body: clean(input.body), mentalModel: clean(input.mentalModel),
    block: { kind: input.block.kind, content: input.block.content.replace(/\s+$/, ""), note: clean(input.block.note) },
    example: clean(input.example), deeper, prove, sources, rejected,
  };
}

/** A hand-written topic: its lesson and its proof prompt, so neither needs generating. */
export interface AuthoredTopic {
  topicId: string;
  /** When the sources were last checked by hand. */
  checkedOn: string;
  lesson: LessonContent;
  proof: TopicQuestion;
}

function fail(where: string, message: string): never {
  throw new Error(`${where}: ${message}`);
}

function text(value: unknown, where: string): string {
  if (typeof value !== "string" || !value.trim()) fail(where, "expected text");
  return value.trim();
}

function texts(value: unknown, where: string): string[] {
  if (!Array.isArray(value) || !value.length) fail(where, "expected a list");
  return value.map((item, index) => text(item, `${where}[${index}]`));
}

/** Validates a hand-written lesson file in content/engineering-lab/lessons. */
export function parseAuthoredTopic(raw: unknown, file: string): AuthoredTopic {
  const input = (raw ?? {}) as Record<string, unknown>;
  const lesson = (input.lesson ?? {}) as Record<string, unknown>;
  const block = (lesson.block ?? {}) as Record<string, unknown>;
  const deeper = lesson.deeper as Record<string, unknown> | null | undefined;
  const proof = (input.proof ?? {}) as Record<string, unknown>;
  const kind = block.kind;
  if (!LESSON_BLOCK_KINDS.includes(kind as LessonBlockKind)) fail(`${file} lesson.block.kind`, `expected one of ${LESSON_BLOCK_KINDS.join(", ")}`);
  const prove = texts(lesson.prove, `${file} lesson.prove`);
  if (prove.length !== 3) fail(`${file} lesson.prove`, "expected exactly 3 lines");
  const sources = (Array.isArray(lesson.sources) ? lesson.sources : []).map((value, index) => {
    const source = (value ?? {}) as Record<string, unknown>;
    const url = text(source.url, `${file} lesson.sources[${index}].url`);
    if (!url.startsWith("https://")) fail(`${file} lesson.sources[${index}]`, "url must be https");
    return { title: text(source.title, `${file} lesson.sources[${index}].title`), url };
  });
  if (!sources.length) fail(`${file} lesson.sources`, "a lesson needs at least one source");
  const rubric = texts(proof.rubric, `${file} proof.rubric`);
  if (rubric.length > 4) fail(`${file} proof.rubric`, "expected 1 to 4 lines");
  return {
    topicId: text(input.topicId, `${file} topicId`),
    checkedOn: text(input.checkedOn, `${file} checkedOn`),
    lesson: {
      heading: text(lesson.heading, `${file} lesson.heading`),
      body: text(lesson.body, `${file} lesson.body`),
      mentalModel: text(lesson.mentalModel, `${file} lesson.mentalModel`),
      block: { kind: kind as LessonBlockKind, content: text(block.content, `${file} lesson.block.content`), note: text(block.note, `${file} lesson.block.note`) },
      example: text(lesson.example, `${file} lesson.example`),
      deeper: deeper ? { title: text(deeper.title, `${file} lesson.deeper.title`), body: text(deeper.body, `${file} lesson.deeper.body`) } : null,
      prove,
      sources,
    },
    proof: {
      prompt: text(proof.prompt, `${file} proof.prompt`),
      code: typeof proof.code === "string" && proof.code.trim() ? proof.code : null,
      rubric,
      referenceAnswer: text(proof.referenceAnswer, `${file} proof.referenceAnswer`),
    },
  };
}

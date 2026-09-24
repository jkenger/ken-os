export const PILOT_PROJECT_ID = "ken-os";
export const MEMORY_SCHEMA_VERSION = 1;

export type MemoryStatus = "proposed" | "approved" | "rejected";
export type DecisionProvenance = "owner_stated" | "agent_decided" | "observed" | "inferred";
export type EvidenceKind = "conversation" | "repo_file" | "commit" | "pr" | "test" | "note";

export interface EvidenceDraft {
  kind: EvidenceKind;
  locator: string;
  relation: "supports" | "context" | "contradicts";
}

export interface DecisionDraft {
  schemaVersion: 1;
  projectId: string;
  taskKey?: string;
  idempotencyKey: string;
  title: string;
  issue: string;
  choice: string;
  rationale: string;
  alternatives: string[];
  provenance: DecisionProvenance;
  evidence: EvidenceDraft[];
}

export interface ReceiptDraft {
  schemaVersion: 1;
  projectId: string;
  policyVersion: 1;
  taskKey: string;
  idempotencyKey: string;
  outcome: string;
  verification: string[];
  remaining: string[];
  evidence: EvidenceDraft[];
}

export type DecisionRevision = Pick<DecisionDraft, "title" | "issue" | "choice" | "rationale" | "alternatives">;
export type ReceiptRevision = Pick<ReceiptDraft, "outcome" | "verification" | "remaining">;

export const pilotPolicy = {
  schemaVersion: MEMORY_SCHEMA_VERSION,
  projectId: PILOT_PROJECT_ID,
  version: 1,
  sharingMode: "personal_only",
  rules: [
    "Read approved memory before substantial work when an authorized adapter is available.",
    "Checkpoint consequential decisions when made, not only at task end.",
    "Submit one concise receipt at completion or deliberate handoff.",
    "Cite evidence you can actually access and distinguish owner statements from inference.",
    "Do not upload work or client project content, raw transcripts, credentials, or tokens.",
    "Never rewrite commits or pull requests just to satisfy capture.",
  ],
  review: "Every draft remains proposed until the owner approves or rejects it.",
} as const;

export class MemoryInputError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

function object(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new MemoryInputError("Expected an object.");
  return input as Record<string, unknown>;
}

function bounded(value: unknown, label: string, max: number, required = true): string {
  if (typeof value !== "string") throw new MemoryInputError(`${label} must be text.`);
  const clean = value.trim();
  if ((required && !clean) || clean.length > max) throw new MemoryInputError(`${label} must be ${required ? "1" : "0"}–${max} characters.`);
  if (/\b(?:sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9_]{20,}|km_[A-Za-z0-9_-]{20,})\b/.test(clean)) {
    throw new MemoryInputError(`${label} appears to contain a credential. Remove it before submitting.`);
  }
  return clean;
}

function list(value: unknown, label: string, maxItems: number, maxChars: number): string[] {
  if (!Array.isArray(value) || value.length > maxItems) throw new MemoryInputError(`${label} must have at most ${maxItems} items.`);
  return value.map((item) => bounded(item, label, maxChars));
}

function projectAndKey(input: Record<string, unknown>) {
  if (input.schemaVersion !== MEMORY_SCHEMA_VERSION) throw new MemoryInputError("Unsupported memory schema version.");
  if (input.projectId !== PILOT_PROJECT_ID) throw new MemoryInputError("Only the Ken OS pilot project is allowed.", 403);
  const idempotencyKey = bounded(input.idempotencyKey, "Idempotency key", 120);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(idempotencyKey)) throw new MemoryInputError("Invalid idempotency key.");
  return idempotencyKey;
}

function parseEvidence(value: unknown): EvidenceDraft[] {
  if (!Array.isArray(value) || value.length > 10) throw new MemoryInputError("Evidence must have at most 10 references.");
  return value.map((item) => {
    const data = object(item);
    const kinds = ["conversation", "repo_file", "commit", "pr", "test", "note"];
    const relations = ["supports", "context", "contradicts"];
    if (!kinds.includes(String(data.kind))) throw new MemoryInputError("Unsupported evidence kind.");
    if (!relations.includes(String(data.relation))) throw new MemoryInputError("Unsupported evidence relation.");
    const locator = bounded(data.locator, "Evidence locator", 500);
    if (["commit", "pr"].includes(String(data.kind))) {
      let url: URL;
      try { url = new URL(locator); } catch { throw new MemoryInputError("Commit and PR evidence require an HTTPS URL."); }
      if (url.protocol !== "https:" || url.username || url.password) throw new MemoryInputError("Commit and PR evidence require an HTTPS URL without credentials.");
    }
    if (data.kind === "repo_file" && (/^(?:[A-Za-z]:|[\\/])/.test(locator) || locator.split(/[\\/]/).includes(".."))) {
      throw new MemoryInputError("Repository file evidence must use a relative path.");
    }
    return { kind: data.kind as EvidenceKind, locator, relation: data.relation as EvidenceDraft["relation"] };
  });
}

export function parseDecisionDraft(input: unknown, ownerSubmitting = false): DecisionDraft {
  const data = object(input);
  const idempotencyKey = projectAndKey(data);
  const provenance = data.provenance;
  if (!["owner_stated", "agent_decided", "observed", "inferred"].includes(String(provenance))) throw new MemoryInputError("Invalid decision provenance.");
  const evidence = parseEvidence(data.evidence);
  if (provenance === "owner_stated" && !ownerSubmitting && !evidence.some((item) => item.kind === "conversation")) {
    throw new MemoryInputError("An owner-stated decision needs a conversation reference.");
  }
  return {
    schemaVersion: 1,
    projectId: PILOT_PROJECT_ID,
    taskKey: data.taskKey === undefined ? undefined : bounded(data.taskKey, "Task key", 120),
    idempotencyKey,
    title: bounded(data.title, "Title", 160),
    issue: bounded(data.issue, "Issue", 1000),
    choice: bounded(data.choice, "Choice", 1000),
    rationale: bounded(data.rationale, "Rationale", 2000),
    alternatives: list(data.alternatives, "Alternatives", 5, 300),
    provenance: provenance as DecisionProvenance,
    evidence,
  };
}

export function parseReceiptDraft(input: unknown): ReceiptDraft {
  const data = object(input);
  const idempotencyKey = projectAndKey(data);
  if (data.policyVersion !== pilotPolicy.version) throw new MemoryInputError("Policy version mismatch.", 409);
  return {
    schemaVersion: 1,
    projectId: PILOT_PROJECT_ID,
    policyVersion: 1,
    taskKey: bounded(data.taskKey, "Task key", 120),
    idempotencyKey,
    outcome: bounded(data.outcome, "Outcome", 3000),
    verification: list(data.verification, "Verification", 10, 300),
    remaining: list(data.remaining, "Remaining work", 10, 300),
    evidence: parseEvidence(data.evidence),
  };
}

export function parseDecisionRevision(input: unknown): DecisionRevision {
  const data = object(input);
  return {
    title: bounded(data.title, "Title", 160),
    issue: bounded(data.issue, "Issue", 1000),
    choice: bounded(data.choice, "Choice", 1000),
    rationale: bounded(data.rationale, "Rationale", 2000),
    alternatives: list(data.alternatives, "Alternatives", 5, 300),
  };
}

export function parseReceiptRevision(input: unknown): ReceiptRevision {
  const data = object(input);
  return {
    outcome: bounded(data.outcome, "Outcome", 3000),
    verification: list(data.verification, "Verification", 10, 300),
    remaining: list(data.remaining, "Remaining work", 10, 300),
  };
}

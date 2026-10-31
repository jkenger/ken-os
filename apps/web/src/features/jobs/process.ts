import type { AlertSource } from "./raw-posting";

// Reads, extracts and saves structured fields for the owner's pending postings (plans/jobs-score.md, Slice 1).
// Dependencies are injected so this stays testable without a real HTTP call, AI call or database.

const BATCH_SIZE = 5;

type PendingPosting = {
  id: string;
  title: string;
  company: string;
  location: string;
  snippet: string;
  sources: { source: AlertSource; link: string }[];
};

type ExtractResult = {
  payAmount: number | null;
  payCurrency: string | null;
  payPeriod: "hour" | "day" | "week" | "month" | "year" | null;
  jobType: "full_time" | "part_time" | "contract" | "internship" | "temporary" | null;
  workSetup: "remote" | "hybrid" | "on_site" | null;
  countries: string[];
  requiredHours: { start: string; end: string; timezone: string } | null;
  seniority: "junior" | "mid" | "senior" | "lead" | null;
  yearsRequired: number | null;
  isAgency: boolean;
  summary: string;
  promptVersion: string;
  model: string;
};

type ExtractedFields = {
  fullDescription: string | null;
  partial: boolean;
  summary: string;
  payAmount: number | null;
  payCurrency: string | null;
  payPeriod: "hour" | "day" | "week" | "month" | "year" | null;
  jobType: "full_time" | "part_time" | "contract" | "internship" | "temporary" | null;
  workSetup: "remote" | "hybrid" | "on_site" | null;
  countries: string[];
  requiredHours: { start: string; end: string; timezone: string } | null;
  seniority: "junior" | "mid" | "senior" | "lead" | null;
  yearsRequired: number | null;
  isAgency: boolean;
  extractPromptVersion: string;
  extractModel: string;
};

export async function processPostings(params: {
  secret: string;
  expectedSecret: string;
  getPending: (limit: number) => Promise<PendingPosting[]>;
  readFullPosting: (sources: { source: AlertSource; link: string }[]) => Promise<string | null>;
  extract: (input: { title: string; company: string; location: string; text: string }) => Promise<ExtractResult>;
  saveExtracted: (postingId: string, fields: ExtractedFields) => Promise<void>;
}): Promise<{ ok: boolean; reason: string; processed: number }> {
  if (params.secret !== params.expectedSecret) return { ok: false, reason: "bad secret", processed: 0 };

  const pending = await params.getPending(BATCH_SIZE);
  for (const posting of pending) {
    const fullDescription = await params.readFullPosting(posting.sources);
    const partial = fullDescription === null;
    const text = fullDescription ?? posting.snippet;

    const extracted = await params.extract({
      title: posting.title,
      company: posting.company,
      location: posting.location,
      text,
    });

    await params.saveExtracted(posting.id, {
      fullDescription,
      partial,
      summary: extracted.summary,
      payAmount: extracted.payAmount,
      payCurrency: extracted.payCurrency,
      payPeriod: extracted.payPeriod,
      jobType: extracted.jobType,
      workSetup: extracted.workSetup,
      countries: extracted.countries,
      requiredHours: extracted.requiredHours,
      seniority: extracted.seniority,
      yearsRequired: extracted.yearsRequired,
      isAgency: extracted.isAgency,
      extractPromptVersion: extracted.promptVersion,
      extractModel: extracted.model,
    });
  }

  return { ok: true, reason: "ok", processed: pending.length };
}

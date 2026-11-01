# CV tailoring

Status: specified 1 Nov 2026, not yet planned or built. Decisions below were agreed with the owner in chat on
1 Nov 2026. Depends on the Jobs feature (`docs/product/job-finder.md`) and the Profile/resume builder
(`docs/product/profile-resume.md`), both already built.

## The idea in one line

From a scored posting's side panel, the owner generates a tailored resume for that one posting: the same facts
from their Profile, reordered and filtered to lead with what's relevant, rendered through their existing template,
and kept so they can come back to it later.

## Decisions

| Question                 | Decision                                                                                                                                                                                                                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What "tailoring" means   | Reorders and filters which Experience, Skills and Projects entries show, and in what order. Never rewrites or invents wording -- every bullet reads exactly as it does in the Profile.                                                                                                      |
| Scope of what's touched  | Experience, Skills, Projects only. Education and the Summary are untouched, same as the owner's default resume.                                                                                                                                                                             |
| Trigger                  | Manual. A "Tailor resume" button in the posting's side panel (`posting-panel.tsx`), which already has this slot reserved among its action buttons.                                                                                                                                          |
| Relevance ranking        | One AI call, given the owner's full Profile and the posting's full extracted text in a single prompt -- same architecture already used for extraction and scoring. No retrieval/RAG step: the documents involved are small enough to pass in full, the same way `score.ts` already does.    |
| No-relevant-content case | Falls back to the full resume, unfiltered, in its normal order. Never produces a thin or near-empty result.                                                                                                                                                                                 |
| Template                 | Always the owner's existing default template (Classic/Compact/Technical). No per-posting template choice.                                                                                                                                                                                   |
| Regeneration             | Clicking "Tailor resume" again on a posting that already has one overwrites it. No version history.                                                                                                                                                                                         |
| Staleness                | A generated tailored resume is a frozen snapshot: it does not change when the owner later edits their Profile. Matches the existing `profileVersionScored` precedent, where a score is also frozen against the Profile version it judged. Only clicking "Tailor resume" again refreshes it. |
| Storage                  | A rendered PDF, stored as bytes -- same pattern as uploaded resumes (`profile_resumes`). Reopening a posting serves the stored file instantly; nothing re-renders on view.                                                                                                                  |

## What this is not (yet)

Two related ideas came up and are real candidates for later, not part of this story:

- **A per-posting cover letter.** A new generated document arguing why the (tailored or default) resume fits this
  posting. Not scoped here.
- **An ATS/keyword alignment check.** A comparison showing which of a posting's stated requirements the Profile
  already covers and which it's missing, with no new document generated. Not scoped here.

Revisit both after this story ships.

## Open, not yet answered

- Exact AI prompt/schema design for the relevance-ranking call (what input shape, what output shape -- an ordered
  list of entry IDs to include, most likely, mirroring how `score.ts`'s `whyFits`/`whatsMissing` already cite the
  posting's own words).
- Where the generated PDF lives in the UI once stored (a link/button in the panel; exact placement not decided).
- Database shape for the new table (one row per posting per owner, holding the rendered PDF bytes and the AI's
  selection, likely keyed the same way `job_matches` is).
- Whether a failed AI call (timeout, no output) should fall back to the unfiltered full resume, matching the
  no-relevant-content case, or show a retry.

These are implementation-level, not business-rule-level -- they belong in `planning`, not here.

## Why this story, now

The owner moved Jobs off hand-built scrapers onto `freehire` specifically to free up effort for "CV tailoring and
smart matching." Smart matching shipped (`docs/product/job-finder.md`, `plans/jobs-score.md` -- scoring, why-it-
fits, what's-missing, now visible in the posting panel). This is the other half.

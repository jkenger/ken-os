# Cover letter tailoring

Status: specified 17 Nov 2026, not yet planned or built. Decisions below were agreed with the owner in chat on
17 Nov 2026. Depends on the Jobs feature (`docs/product/job-finder.md`, built, specifically scoring's `whyFits`)
and the Profile (`docs/product/profile-resume.md`, built). Does **not** depend on CV tailoring
(`docs/product/cv-tailoring.md`, specified, not yet built) — the two are independent, despite CV tailoring's own
"what this is not (yet)" section once framing a cover letter as arguing for "the (tailored or default) resume."

## The idea in one line

From a scored posting's side panel, the owner generates a cover letter for that one posting: AI-written prose
that argues fit, built from the same `whyFits` reasons scoring already computed plus the owner's Profile facts,
shown as editable text they can tweak before copying or sending.

## Decisions

| Question                    | Decision                                                                                                                                                                                                                                                                                                                                           |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency on CV tailoring  | None. Stands alone — reads the Profile and the posting's scoring output directly. Ships independent of whether CV tailoring exists or whether a tailored resume has been generated for this posting.                                                                                                                                               |
| What "tailoring" means      | New prose, not reordering. Unlike CV tailoring (never invents wording, only reorders real bullets), a cover letter is inherently generated sentences — but every _claim_ it makes must trace to a real fact in the Profile. No invented achievements, titles, skills, numbers or employers.                                                        |
| Guardrail mechanism         | Reuses the Profile-rewrite feature's established pattern (`packages/agents/src/profile/rewrite.ts`, `checkRewrite` in `@ken-os/domain`): prompt instructions naming exactly what can't be invented, plus a code-level post-check. The check needs adapting for free-form letter text rather than discrete bullet suggestions — see Open questions. |
| Content source              | Built from scoring's own `whyFits` (reasons + citations already computed for this posting) plus Profile facts — not a fresh independent AI read of the full posting text. Keeps the letter consistent with what the panel already shows, and the AI call lighter than CV tailoring's or scoring's own full-posting read.                           |
| Trigger                     | Manual. A new "Write cover letter" button in the posting's side panel (`posting-detail.tsx`), alongside the existing (still inert) "Tailor my CV" button — two independent actions.                                                                                                                                                                |
| Output format               | Editable text (stored as text, e.g. markdown or plain), not a rendered PDF — a deliberate divergence from CV tailoring, since a cover letter is personal wording an owner will want to tweak, not a fixed layout.                                                                                                                                  |
| Where it's shown            | A third tab, Cover letter, on the posting's own Job detail page (`/jobs/[id]`), beside Description and Company. Not a separate route and not a modal (owner, 17 Nov 2026, mockup review).                                                                                                                                                          |
| Regeneration                | Clicking "Write cover letter" again overwrites the existing letter, no version history — **unless** the owner has edited the current letter since it was generated, in which case a confirmation ("This replaces your edited letter") appears first. Regenerating a never-edited AI draft still overwrites silently.                               |
| Staleness                   | A generated letter is a frozen snapshot: it does not change when the owner later edits their Profile, same precedent as CV tailoring's and scoring's own frozen-version behavior. Only clicking "Write cover letter" again refreshes it.                                                                                                           |
| Length/structure guidance   | None fixed. Left to the AI's own judgment; revisited later if that's a problem in practice.                                                                                                                                                                                                                                                        |
| Failure / thin-content case | If the AI call fails, or `whyFits` is empty or too thin to write from, show an error ("Couldn't write a letter for this posting" or similar) — no letter is generated, no generic/placeholder text, no silent fallback. The owner can retry.                                                                                                       |
| Button copy                 | "Write cover letter" — plain verb + object, parallel weight to "Tailor resume."                                                                                                                                                                                                                                                                    |

## What this is not (yet)

- **A cover letter tied to a tailored resume's specific selections.** If CV tailoring ships later and the owner
  wants the letter to reference which Experience/Skills entries a tailored resume picked, that's a future
  revision, not part of this story — the two stay independent for now.
- **PDF export of the letter.** Editable text only; a later "export to PDF" action is a candidate, not scoped here.
- **Multiple letters per posting, or per-posting tone/style presets.** One letter per posting, overwritten on
  regeneration, same model as CV tailoring.

## Open, not yet answered

- Exact AI prompt/schema design for the letter-writing call (input shape: `whyFits` + which Profile fields;
  output shape: plain text vs. a structured paragraph list).
- How the fact-check adapts from `checkRewrite`'s discrete-suggestion model to free-form letter text — likely
  still number-focused at minimum (reject/flag any number not in the Profile), but the harder cases (an invented
  employer name, an invented responsibility woven into a sentence) may need a different mechanism than a simple
  post-check. Needs its own pass in `planning`.
- How "edited since generation" is detected for the overwrite-warning rule — most likely a stored-text comparison
  (current saved text vs. the text as last generated), not a separate "touched" flag, but exact mechanism is
  implementation-level.
- Database shape for the new content (one row per posting per owner, holding the letter text, when it was
  generated, and the Profile version it was built against — mirroring `profileVersionScored`'s staleness
  precedent). Likely its own table or a new column set, not decided here.
- Exact route/page URL and its relationship to `/jobs/[id]` (a sub-route, most likely, but not fixed).

These are implementation-level, not business-rule-level — they belong in `planning`, not here.

## Candidate terms

- **Cover letter** (as opposed to "cover note," used once in `job-finder.md`'s "Later" list) — this spec adopts
  "cover letter" throughout; `job-finder.md`'s own wording should be updated to match during `planning`, same
  as `cv-tailoring.md` already flagged for "Tailor my CV" vs. "Tailor resume."
- **Fact-bound** — this spec's own shorthand for "every claim traces to a real Profile fact," not an existing
  term elsewhere in the codebase.

## Why this story, now

The owner moved Jobs off hand-built scrapers onto `freehire` specifically to free up effort for "CV tailoring and
smart matching" (`docs/product/job-finder.md`). Smart matching and CV tailoring are already specified; this is
the other document a job application actually needs, made possible by scoring's `whyFits` already existing as a
ready-made argument for fit.

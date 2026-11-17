# CV tailoring — technical design

Product spec: `docs/product/cv-tailoring.md`. The UI slot already exists — a disabled "Tailor my CV" button at
`posting-detail.tsx:203`, with a comment flagging it as its own story.

## Module: the AI selection call

New file `packages/agents/src/jobs/tailor.ts`, same shape as `score.ts` (`Agent` + zod `outputType` + one prompt,
profile and posting text passed in full, no retrieval).

`ProfileExperience`, `ProfileSkillGroup` and `ProfileProject` have no stable id (`packages/domain/src/profile.ts`)
— they're plain arrays. The model is given each array in its existing order and returns **indices into that
array**, so "tailoring" can only ever reorder/filter what's already there, never invent an entry.

```ts
const outputSchema = z.object({
  experience: z.array(z.number().int()),
  skills: z.array(z.number().int()),
  projects: z.array(z.number().int()),
});

export async function selectTailoredEntries(params: {
  profile: ProfileDetails;
  title: string;
  company: string;
  text: string;
}): Promise<TailoredSelection>; // { experience: number[]; skills: number[]; projects: number[] }
```

Each array is the order to show that section in; an index may be omitted to drop that entry. Indices out of
bounds are dropped (never trust model output past the schema). If all three arrays come back empty, that's the
no-relevant-content case: the caller falls back to every entry in its original order (spec, "No-relevant-content
case").

## Module: building and storing the tailored resume

New function in `apps/web/src/features/jobs/tailor.ts`: `tailorResume(userId, postingId): Promise<void>`.

1. Load the Profile and the posting's full text (`posting.fullDescription ?? posting.summary`, the same source
   `score.ts` callers already use).
2. Call `selectTailoredEntries`. A thrown error (timeout, no output) propagates — no fallback on infra failure,
   per the owner's call: the owner wants to know tailoring didn't run, not get a silently-unfiltered resume.
3. If the selection is empty on all three arrays, use the full profile, unfiltered, in its original order.
   Otherwise slice and reorder `profile.experience` / `.skills` / `.projects` by the returned indices; every
   other field (`contact`, `summary`, `education`, `certifications`, `languages`, `local`) is untouched.
4. Render with the existing `renderResumePdf(filteredProfile, profile.resume.template, profile.resume.paper)`
   (`features/profile/resume-pdf.tsx`) — no new PDF code.
5. Upsert into `job_tailored_resumes` (overwrite on regenerate, per spec: "no version history"). Steps 1 to 4
   happen before this write, so a failed regenerate (step 2 throws) never touches the existing row — the earlier
   tailored resume survives, per the mockup's open question 1. No extra code needed for this; it falls out of the
   ordering.

Deleting this module would mean every caller re-implementing index-bounds-checking, the empty-selection fallback,
and the profile-slicing by hand — it earns its place as one module instead of inlined in the route.

## Data model

New table, same 1-row-per-posting-per-user shape as `job_matches`:

```ts
export const jobTailoredResumes = pgTable("job_tailored_resumes", {
  postingId: text("posting_id")
    .primaryKey()
    .references(() => jobPostings.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  data: bytea("data").notNull(),
  size: integer("size").notNull(),
  selection: jsonb("selection").$type<{ experience: number[]; skills: number[]; projects: number[] }>().notNull(),
  promptVersion: text("prompt_version").notNull(),
  model: text("model").notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

No `contentType` column — always `application/pdf`, unlike `profile_resumes` which stores whatever the owner
uploaded. No staleness flag: the spec is explicit that a tailored resume never auto-refreshes against later
Profile edits, and nothing reads a staleness state to show one.

## Routes

`apps/web/src/app/api/jobs/postings/[id]/tailor/route.ts`, same `jobsRoute` wrapper as `save`/`apply`:

- `POST` — runs `tailorResume`, overwriting any existing row. Returns `{ generatedAt }` on success. A thrown
  error from the AI call surfaces as the route's normal error response (`jobsRoute` already catches and
  JSON-errors); no special handling needed here.
- `GET` — serves the stored PDF bytes with `resumePdfHeaders`-style headers (same as
  `api/profile/resume/route.ts`), 404 if no row exists yet.

## UI: `posting-detail.tsx`

Drawn in `docs/mockups/cv-tailoring.md` / `docs/mockups/cv-tailoring-canvas/` (frames A1-A7). The button at line
203 gains three states instead of one `disabled`:

- **No tailored resume yet**: "Tailor my CV", `FileText` icon. Click → `POST .../tailor`; the icon becomes a
  `LoaderCircle` with `animate-spin` while pending (A2). This same pending look is reused for regenerate (A4) —
  one pending state, not two.
- **Success**: a single split button (A3) — "View tailored CV" (opens the `GET` route in a new tab, `ArrowUpRight`
  icon with the job list's 2px hover nudge) and, separated by a 1px seam, an icon-only "Regenerate" control
  (`aria-label="Regenerate tailored CV"`, tooltip "Regenerate") that re-runs `POST`. Regenerate only renders once a
  tailored resume exists — never in A1, A2 or A5.
- **Error**: `toast({ tone: "error", title: "Couldn't generate. Try again" })` (app-language error shape: what
  failed, then what to do — no em dash). The button returns to A1 (first attempt) or A3 with the earlier resume
  intact (regenerate) so the owner can retry immediately — no separate dialog.
- **Apply stays enabled** throughout every CV-button state — tailoring is optional and never blocks applying.
- Leaving the page mid-call needs no special handling: the server finishes and persists the row regardless of
  whether the client is still around to see the response; returning to the posting re-fetches its state and
  renders A3 directly.

**Gradient border exception** (`apps/web/DESIGN.md`, "Exception, owner-approved 17 Nov 2026"): the button carries
a new `--cv-tailor-gradient` border token, the one deliberately decorative treatment in the app. Idle at 45%
opacity (A1, A5), full on hover; rotating while pending (A2, A4), alongside the spinner so the state is never
colour alone; full and still once ready (A3, A6).

State (has a tailored resume / is pending / last error) is fetched alongside the posting, same as
`skillMatches`/`mismatches` are derived today — no new client store beyond what the posting fetch already
returns.

## Explicitly out of scope here

Cover letters and the ATS/keyword check (spec, "What this is not (yet)") — not touched by this design.

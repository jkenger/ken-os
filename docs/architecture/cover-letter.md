# Cover letter — technical design

Product spec: `docs/product/cover-letter.md`. Mirrors `docs/architecture/cv-tailoring.md`'s shape where the two
features are alike (DI-style builder function, overwrite-on-regenerate, frozen-snapshot staleness), diverges
where the spec already decided to (prose generation instead of index selection, text storage instead of a PDF,
an edit/overwrite-warning state CV tailoring has no equivalent of).

## Module: the AI writing call

New file `packages/agents/src/jobs/cover-letter.ts`, same shape as `tailor.ts`/`score.ts` (`Agent` + zod
`outputType` + one prompt). Input is deliberately smaller than `tailor.ts`'s: the posting's own full text is
**not** passed again — scoring already read it and produced `whyFits` (reasons with citations to the posting's
own words), so the AI only needs that plus the Profile's facts, title and company.

```ts
const outputSchema = z.object({ content: z.string() });

export async function writeCoverLetter(params: {
  profile: ProfileDetails;
  title: string;
  company: string;
  whyFits: { reason: string; citation: string }[];
}): Promise<{ content: string; promptVersion: string; model: string }>;
```

Instructions follow `rewrite.ts`'s established guardrail wording directly: "Use only facts in the profile. Never
add a tool, result, team size, number, title, employer or responsibility that isn't there," adapted from editing
bullets to writing a full letter. No length/structure instruction, per spec ("left to the AI's own judgment").

## Module: the number fact-check

`rewrite.ts`'s guardrail is prompt instructions plus one code-level check: `checkRewrite` drops any suggestion
introducing a number the Profile doesn't contain, using `knownNumbers(details)`
(`packages/domain/src/rewrite.ts`) — every digit sequence that appears anywhere in the Profile, including years
pulled from dates. That same primitive is directly reusable here unchanged:

```ts
// apps/web/src/features/jobs/cover-letter.ts
function hasInventedNumber(content: string, profile: ProfileDetails): boolean {
  const known = knownNumbers(profile);
  const found = content.match(/\d+(?:[.,]\d+)?/g) ?? [];
  return found.some((n) => !known.has(n));
}
```

Unlike `checkRewrite` (drops the one bad suggestion, keeps the rest), there's no partial letter to fall back to —
an invented number fails the whole generation, same bucket as the spec's other failure case (AI error, empty
`whyFits`): no letter saved, an error shown, the owner can retry. Non-numeric invented facts (an employer name, a
responsibility) stay prompt-instruction-only, same split `rewrite.ts` already accepts — there's no code-level
check for those there either, and inventing one now would be new scope the spec never asked for.

## Module: building and storing the letter

New function in `apps/web/src/features/jobs/cover-letter.ts`, same DI shape as `tailor.ts`'s `tailorResume`:

```ts
export async function writeCoverLetterForPosting(params: {
  userId: string;
  postingId: string;
  getProfile: (userId: string) => Promise<ProfileDetails>;
  getPosting: (userId: string, postingId: string) => Promise<{ title: string; company: string; whyFits: {...}[] } | null>;
  generate: (input: {...}) => Promise<{ content: string; promptVersion: string; model: string }>;
  save: (postingId: string, userId: string, fields: CoverLetterFields) => Promise<void>;
}): Promise<void>;
```

1. Load the Profile and the posting (its `whyFits`, already computed by scoring — no full-text re-read).
2. If `whyFits` is empty, throw before ever calling the AI (spec's failure case — no point spending a call on
   nothing to write from).
3. Call `generate`. A thrown error propagates untouched, same as `tailorResume` step 2 — no fallback.
4. Run the number check on the result. A failure throws the same shape as step 2/3 — the route can't tell (and
   doesn't need to) which of the three failure modes fired; all three mean "couldn't write a letter."
5. Upsert into `job_cover_letters`, overwriting any existing row — steps 1 to 4 happen first, so a failed
   regenerate never touches the existing letter, same ordering argument as `tailorResume`.

The owner-edit-overwrite-warning (spec: confirm before overwriting an edited letter) is **not** this function's
job — it's a route-level check before this function is even called, see Routes below. Keeping it out of this
function means the plain "regenerate" path (CLI, a test, a future bulk-regenerate) never has to thread a
confirmation flag through business logic that has nothing to do with confirmation.

## Data model

```ts
export const jobCoverLetters = pgTable("job_cover_letters", {
  postingId: text("posting_id")
    .primaryKey()
    .references(() => jobPostings.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  promptVersion: text("prompt_version").notNull(),
  model: text("model").notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

Same 1-row-per-posting-per-user shape as `job_tailored_resumes`. The spec's open question ("how is 'edited since
generation' detected") is answered here: both timestamps are set equal at generation time; a manual save
(PUT, below) only moves `updatedAt`. **Edited since generation** is exactly `updatedAt > generatedAt` — no
separate boolean to keep in sync, no risk of it drifting from the two timestamps that already have to exist for
other reasons (frozen-snapshot staleness needs `generatedAt`; any editable content needs _an_ updated-at).

## Routes

`apps/web/src/app/api/jobs/postings/[id]/cover-letter/route.ts`, same `jobsRoute` wrapper as `save`/`apply`/`tailor`:

- `POST`, body `{ force?: boolean }` — if a row exists and `updatedAt > generatedAt` (owner has edited it) and
  `force` isn't `true`, returns `409 { edited: true }` without regenerating — the client shows the confirm
  dialog and resubmits with `force: true`. Otherwise runs `writeCoverLetterForPosting`, returns
  `{ content, generatedAt }`. A thrown error from the module surfaces as the route's normal JSON error response
  (`jobsRoute` already catches), message "Couldn't write a letter for this posting."
- `PUT`, body `{ content: string }` — updates `content` and `updatedAt` on the existing row only (404 if none
  exists — can't edit a letter that was never generated). No AI call, no fact-check: the owner is the one
  writing this text now, the same way the owner's own Profile edits are never number-checked either.
- `GET` — returns `{ content, generatedAt, updatedAt } | null`, read by the page server component.

No separate route needed to answer "has this been edited" — the page already has `generatedAt`/`updatedAt` from
`GET` and computes it the same way the POST route's own check does.

## UI: a Cover letter tab on Job detail

No new route. The letter lives in a third tab, **Cover letter**, on the existing Job detail page
(`posting-detail.tsx`), beside Description and Company (owner, 17 Nov 2026, from the mockup review in
`docs/mockups/cover-letter-canvas/`). `posting-detail.tsx` also gains a "Write cover letter" button next to the
CV button in the title row. Unlike the CV button it has no pending or ready state of its own: it only switches to
the Cover letter tab, and reads "View cover letter" once a letter exists. The page server component reads the
letter with `GET` alongside the posting, the same way it already reads `hasTailoredResume`.

- **Default tab**: Job detail always opens on Description, even when a letter exists; the title row button is
  how the owner jumps to the tab.
- **No letter yet**: the tab shows an empty state across its full width ("Write a cover letter for this posting",
  one line, the "Write cover letter" action) — same copy register as every other Jobs empty state
  (`job-finder.md`, app-language rules).
- **Generating**: pending state on the one action available.
- **Has a letter**: an editable `Textarea` (shadcn) pre-filled with `content`, a status line ("Written <date>",
  or "Edited" once the text differs from what loaded), and three actions: "Copy letter" (copies the textarea as
  it is, edits included, then a "Letter copied" toast), "Regenerate", and "Save" (enabled only once the text
  differs from what's loaded — same dirty-check every other autosave-less form in this app uses).
- **Switching tabs**: unsaved edits live in the tab's client state for as long as the page is open, so moving to
  Description and back loses nothing.
- **Regenerate, not edited**: calls `POST` directly, replaces the text on success.
- **Regenerate, edited** (`updatedAt > generatedAt`): `AlertDialog` ("Rewrite this letter?" / "Your edits are
  replaced by a new letter" / Cancel, Rewrite letter), same primitive `use-apply-flow.tsx`'s dialog already uses —
  "Rewrite letter" calls `POST` with `force: true`.
- **Regenerate fails**: the letter stays as it was, the buttons re-enable, and an error toast says "Couldn't
  write a letter. Try again".
- **Error, first generation** (AI failure, number check, empty `whyFits`): the tab shows "Couldn't write a
  letter for this posting" inline with the same "Write cover letter" action, not a toast — the tab's only
  content _is_ the letter, so an error replacing the empty state is more honest than a toast floating over
  nothing.
- **Phones**: the title row's action group wraps (`flex-wrap`), since the CV button, the cover letter button and
  Apply together are wider than a phone.

## Explicitly out of scope here

PDF export, multi-letter history, tone presets — spec's own "What this is not (yet)."

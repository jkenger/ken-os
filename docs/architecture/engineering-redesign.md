# Engineering redesign: reconciliation and build record

Status: **Slice 0 reconciled and the four tabs built on 2026-10-06, in the prototype's look; the owner's four answers (section 6) are applied.** Not deployed. The owner still has to take the baseline, which unlocks the Slice 2 acceptance gate and the legacy-baseline retirement.

The proposal is [engineering-redesign-handoff.md](../product/engineering-redesign-handoff.md), dated 2026-10-06, together with the "light Evidence Workbench" prototype (`Ken-OS-Engineering-Design.zip`, not checked in). The [module handoff](../product/ai-engineering-learning-handoff.md) is still the source of truth inside the module, and [engineering-lab.md](engineering-lab.md) still records decisions. This file records what the redesign proposal met in the real repository, and what was built from it.

## 1. What the repository actually has (Slice 0)

Checked against `main` at `c61c0a7` on 2026-10-06.

| Proposal assumption | Repository fact | Effect |
|---|---|---|
| 52 topics, 13 chapters, two tracks, 48 labs | Confirmed: `topics.yaml` has 52 topics in 13 chapters; `labs/` has 48 labs | Scope computed from content, as asked |
| Profile branch "built, maybe not merged" | Merged in PR #10; migration `0009_lab_profile.sql` is on `main` | Reskin, don't rebuild |
| Roles approved 2026-10-05 | `roles.yaml`: `status: approved`, `approvedOn: "2026-10-05"` | Used as is |
| Real baseline pending | Can't be checked from here (see section 4). Docs say it's waiting on the owner | Legacy summary still replayed until a baseline completes; retirement not started |
| Page routes `/lab`, `/lab/profile`, `/lab/assessment`, `/lab/practice`, `/lab/topics`, `/lab/topics/:id` | Exactly these six | Mapped one to one (section 3) |
| API under `/api/lab` | 18 route handlers under `apps/web/src/app/api/lab` | Kept unchanged; no endpoint moved |
| Feature-flag mechanism | None exists in Ken OS | See decision D6 |
| Domain in `packages/domain/src/engineering-lab`, agents in `packages/agents/src/engineering-lab` | Confirmed | Unchanged |
| Ken OS visual base | Manrope headings, Source Sans 3 body, warm monochrome tokens, status colours only for meaning (`engineering-lab-ui.md`) | See decision D1 |

### Evidence rules as implemented

These already match the proposal's hard invariants, so nothing in the domain changed:

- **Proven** (`VALIDATED`) needs every mode in a topic's `prove` list solid, with at least one checked by code (`computeProgress` in `mastery.ts`). An explanation can never stand in for a missing code result.
- **Known** is `VALIDATED` or a passed placement-style sitting (`isKnown`). Placement-style kinds are `placement`, `baseline` and `checkpoint`, but the imported 1 Oct summary (`kind: baseline`, `gradedBy: baseline`) is excluded by `isLegacyBaseline`. This is the provenance split the proposal asks for, and it's already tested in `progress.test.ts`.
- **Levels** are `null` until every junior requirement is met (`areaLevel` in `careers.ts`); the screen says "Not yet junior". Unknown is never shown as junior. The overall level is the lowest required area (`roleDistance`).
- **Requirements** are chapter-level at a depth (`aware`, `build` = working, `run` = deep). Topic counts and years never enter it.
- **Assessment runs** freeze their plan at start (`planRun`), skip known topics, allow one answer per item (`lab_attempts_item_unique`), and keep exactly one completed baseline. The allowance is one call per chapter plus six retries, separate from the daily 20.
- **Closed book:** lessons are refused server-side for every topic in an open run (`topicIsClosedBook`); daily practice refuses to start during a run.

### Discrepancies found

These are real differences between the proposal and the code. None was changed silently.

1. **Daily practice can prove an in-progress topic.** `generateDailySet` stores questions for a topic that isn't proven with kind `assessment`, which counts as proof, the same as a topic's Check step. Invariant 6 says practice "cannot first-prove an unknown topic", and v1 §9 says "nothing is proven from practice alone that wasn't proven already". Proof still needs every required mode and one code result, so a single practice answer rarely completes it. **Changed on the owner's answer (Q3):** daily questions on an unproven topic are now kind `practice`, which never counts as proof. Reviews of proven topics still restore them. Earlier daily answers keep their stored kind.
2. **The day boundary is UTC, not Asia/Manila.** `today()` in `daily.ts` and the AI-use limit both use UTC midnight, so the day's set turns over at 08:00 Manila time. The proposal asks for the owner's timezone and also says not to change stored dates silently. **Changed on the owner's answer (Q4):** `lib/day.ts` turns the day over at Manila midnight for daily practice, the 20 AI uses and the 40 lookups (`OWNER_TIME_ZONE` overrides). Daily sets already stored keep their UTC dates, so the switch day may write one extra set.
3. **Term lookup was only hidden on the assessment page** during a run; the server still answered it everywhere. **Fixed:** the lookup route now refuses while a run is open, and Engineering pages hide the Explain button.
4. **Course shows the legacy 1 Oct "solid" as "Known".** Display only: prerequisites and the Planner use `isKnown`, which ignores it. Kept until the retirement removes the legacy summary.
5. **Topic steps:** the proposal's topic stages are Learn, Exercise, Prove. The owner-agreed UI (`engineering-lab-ui.md`, 2026-10-02) has four steps, Learn, Practice, Lab, Check, kept in `?step=`. See decision D3.
6. **Words:** the proposal names the tabs Overview, Profile, Learn, Practice. "Learn" and "Practice" are also two of the four topic step names in the word list. See decision D4.

## 2. Decisions made while building

| # | Question | Decision | Why |
|---|---|---|---|
| D1 | Prototype styling (Inter, indigo accent, blue rails) or Ken OS? | **The prototype's layouts, in Ken OS colours and type.** The owner first took the prototype one to one, then the same day brought back warm monochrome with Manrope and Source Sans 3, with charcoal and stone in place of indigo and blue (design system 0.3.0-working.1). Before that: First scoped to Engineering, then made the Ken OS standard the same day: the tokens live in `features/design-system/contract.ts` (version 0.2.0-working.1) and the `ken-os-design` skill is regenerated from them | Inter and an indigo action colour are on the owner's default avoid list; this is the owner's explicit brand choice, recorded in the contract's decision log. Muted text is #5f6a80, not the prototype's #657086, so it clears 4.5:1 on every surface |
| D2 | Module name | **Engineering** in the sidebar, search and title; `engineering-lab` stays in code, tables and APIs | Proposal §1; a cosmetic rename doesn't touch the database |
| D3 | Topic stages | **Keep four steps, renamed Lesson, Predict, Lab, Prove** (owner, 2026-10-06: "rename"). `?step=` ids stay `learn`, `practice`, `lab`, `check`, so old links work | Keeps predictions and labs apart as the owner asked on 2026-10-02, while "Prove" matches the prototype |
| D4 | Tab names that collided with step names | **Tabs keep the prototype's names; the steps were renamed** (D3) | One name per thing (app-language rule) |
| D5 | Where the existing profile Workbench goes | **`/engineering/profile/direction`**: the Guide pane plus its tabs (roles, chapters, radar, assessments, definitions) | That page already is the direction conversation; the new Profile page is the capability table from the prototype |
| D6 | Feature flag | **No flag.** New pages are additive; the six `/lab` pages redirect with temporary (307) redirects. Rollback is reverting the redirect commit | Ken OS has no flag mechanism, and adding one for a single owner adds more risk than a one-commit revert. No schema change, so rollback loses no evidence |
| D7 | Evidence deep link | **`/engineering/profile/evidence/:attemptId`**, server-rendered, owner-scoped, no new table | Proposal §4 asks for a deep link; all fields already live on `lab_attempts` and `lab_assessments` |
| D8 | Assessment results route | **`/engineering/profile/assessment/:runId/results`** renders the existing assessment screen for that run | Same data as `?run=`, but a stable address |
| D9 | "My path" in Learn | **A filter that shows only chapters the chosen direction needs**, beside the existing "Gaps only" switch | Uses `roleDistance` requirements; no new data |
| D10 | New tables or migrations | **None** | Drafts, submission ledgers and snapshot tables (proposal §9) are not needed for this slice; each is a separate, reviewed change if real use shows the need |

## 3. Routes

| New page | Was | Built from |
|---|---|---|
| `/engineering` | `/lab` | New Overview |
| `/engineering/profile` | (new) | New capability table |
| `/engineering/profile/direction` | `/lab/profile` | Existing Workbench |
| `/engineering/profile/assessment` | `/lab/assessment` | Existing assessment screen |
| `/engineering/profile/assessment/:runId/results` | `/lab/assessment?run=` | Existing assessment screen |
| `/engineering/profile/evidence/:attemptId` | (new) | New evidence page |
| `/engineering/learn` | `/lab/topics` | Existing Course outline, plus My path |
| `/engineering/learn/:topicId` | `/lab/topics/:id` | Existing topic page |
| `/engineering/practice` | `/lab/practice` | Existing practice page |

`/lab/profile` redirects to `/engineering/profile/direction` so its `?pane=` links keep working. Every legacy page keeps its query string. Only pages redirect; POST requests to `/api/lab` are untouched. Links saved in Terms ("where found") still point at `/lab/...` and keep working through the redirects. All in-app links go through `features/engineering-lab/routes.ts`.

The redirects stay temporary until the owner has used the new pages for a while (proposal §13, phase F).

## 4. As built (2026-10-06)

| Piece | Where |
|---|---|
| Route builders, tab mapping, legacy mapping | `apps/web/src/features/engineering-lab/routes.ts` (+ `routes.test.ts`) |
| Legacy redirects | `app/lab/**/page.tsx` via `features/engineering-lab/legacy-redirect.ts` |
| Capability table projection | `features/engineering-lab/capabilities.ts` (+ `capabilities.test.ts`): rows per area from `areaLevel` and `requirementsUpTo`, the next milestone, and Learn's "My path" chapters |
| Evidence read model | `features/engineering-lab/evidence.ts`: `getEvidence` (owner-scoped, hides grade and answer key inside an unfinished run chapter) and `recentEvidence` |
| Pages | `app/engineering/**` |
| New screens | `components/engineering/overview.tsx`, `profile.tsx`, `evidence.tsx`, `level-rail.tsx` |
| Reused screens | Course outline (now titled Learn, with My path), topic page, assessment, practice, profile Workbench (now titled Direction) |
| Shell | Module renamed Engineering; the four sections are in the sidebar and the header keeps the "Ken OS / Engineering" breadcrumb (owner, 2026-10-06, replacing the prototype's header tabs) |
| Closed book | `app/api/terms/lookup/route.ts` refuses while a run is open; Engineering pages hide Explain during a run |
| Profile view | `getProfileView` also returns `progress` and `baselineChapterStates`, so the table uses the same replay as the levels |

Notes:

- **Level words.** The table says "Known" for a placement-style pass and "Proven" for `VALIDATED`. In-app baseline answers can prove a topic when they cover every required mode with a code check (as `computeProgress` already did); lab-only topics can only become Known from a baseline. The evidence page names the attempt kind, so provenance stays visible.
- **The evidence page's "Record" section** shows the question version and model behind a collapsed toggle. The app-language rule keeps model and prompt details off screens; this is the one place they appear, because the handoff asks for traceable grades and the record is content, not frame.
- **The look** follows the prototype one to one: 232px sidebar (205px under 1280px) holding the four sections, a 59px header with the breadcrumb, eyebrow and 36px titles, the capability table, rails (12px segments, lit for the level, soft for an estimate), the tint requirement panel, the milestone column, list rows, the segmented Learn filter, chapter cards, numbered step tabs and square confidence buttons. Building blocks are in `components/engineering/kit.tsx`; icons are Tabler, as in the prototype.
- **Where it differs from the prototype on purpose:** no tagline paragraphs under titles (app-language rule); "Proof coverage" is a count of requirements met, never a percentage; the prototype's illustrative levels, demo grading, Blob worker, localStorage and "From your projects" are not copied; the prototype's rail labels (#748096, 3.9:1) use the muted colour (4.9:1); search and Sign out stay in the header.
- **The Skyline home (`lab-today.tsx`) is no longer routed.** It stays for the `design-preview?view=lab` mockup and is deleted with other redundant UI once the redirects are permanent (proposal §13, phase F).

**Task flows, 2026-10-06 (second pass).** The prototype's end-to-end flow now drives every task screen, on the real engine:

- **Establish profile** (`components/engineering/assessment.tsx`): an intro form (what you build, what you use, AI work so far, weekly hours; never graded), then the assessment one question at a time in a question panel beside a progress column, with Save & exit, the chapter position, a progress track and a How this works dialog. Each chapter starts with a Start chapter step that writes its questions. After each answer: Saved, graded with the chapter, then Next question. Then results with counts, an evidence dialog per chapter, and Choose your direction.
- **Direction** (`direction.tsx`): the prototype's form: target role, what it needs per area, Save direction; pace beside it. The Guide, definitions and added chapters open from here; the old tabbed workbench is no longer routed.
- **Practice** (`practice.tsx`): one review at a time beside a Mixed review column, real grades and feedback after each, then a summary.
- **Overview** opens the radar in a dialog; **topics** have the prototype's header with an Evidence & sources dialog.
- Shared pieces are in `flow.tsx`: flow layout, notes column, session heading, progress track, success view, question panel, feedback block and an accessible dialog (focus moves in, Escape closes, focus returns).
- The prototype's intro asks for a target role; Ken OS keeps direction after the baseline because levels come from it, so the intro does not ask.

Checks run:

- `pnpm test`: 183 pass (169 before, plus 7 projection, 4 route, 1 practice-proof and 2 owner-day tests). Includes the app-language scan of the new screens.
- The prototype ran beside the build (`localhost:5180`) and each screen was compared at desktop width; Profile also at the prototype's 1487×1058.
- `tsc --noEmit` and `next build`: pass. All nine `/engineering` routes and six `/lab` routes build.
- Local Postgres: `test:db:engineering` (new), `test:db:profile`, `test:db:lab`, `test:db:terms` pass.
- Dev server: each `/lab` page returns 307 to its Engineering page with the query kept; signed-out Engineering pages redirect to sign-in.
- Browser, through `/design-preview` (`view=engineering`, `engineering-profile`, `engineering-evidence`, `engineering-learn`): desktop at 1440 and 1487 wide, and phone at 390 wide with no horizontal scroll and the tab bar marking the current page.

## 5. Not verified

- **Production state.** The Vercel connection returned 403 for the `jkengers-projects` scope, and the Neon connection lists no Ken OS project, so neither the deployed commit nor whether a baseline run exists could be read.
- **Signed-in pages.** Google sign-in can't be done by an agent, so the real pages were not opened signed in. The screens were checked through `/design-preview` with preview data.
- **Comparison with the prototype's source image.** The package references `generated_images/exec-…png`, which isn't in the zip. The build was compared with the running prototype instead, not with that image.
- **`pnpm check` on Windows** reports the design-system files as stale because the checkout has CRLF line endings (`core.autocrlf=true`). TypeScript and the lab-content check pass on their own; CI on Linux is the real check.

## 6. Waiting on the owner

1. **Take the baseline** at `/engineering/profile/assessment`. An agent must not answer it. Then the legacy-baseline retirement in [engineering-lab-profile.md](engineering-lab-profile.md) §8 can happen as its own change.
2. **Review the Design System gallery** to approve the new look as 1.0. It stays `working` until then.

Answered 2026-10-06: Q1 the prototype's look one to one (D1); Q2 rename the steps (D3); Q3 practice stops counting as proof; Q4 Manila day. Same day: make the look the Ken OS standard (done in design system 0.2.0-working.1).

## 7. Still deferred, as the proposal says

Knowledge debt, grade disputes, loop health, chapter mixed checkpoints, Obsidian export, real parallel database labs, drafts across devices, idempotent submission ledger, a generic response envelope, and permanent redirects.

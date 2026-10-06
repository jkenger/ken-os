# Engineering redesign: reconciliation and build record

Status: **Slice 0 reconciled and the four-surface shell built locally on 2026-10-06.** Not deployed. The owner still has to take the baseline, which unlocks the Slice 2 acceptance gate and the legacy-baseline retirement.

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

1. **Daily practice can prove an in-progress topic.** `generateDailySet` stores questions for a topic that isn't proven with kind `assessment`, which counts as proof, the same as a topic's Check step. Invariant 6 says practice "cannot first-prove an unknown topic", and v1 §9 says "nothing is proven from practice alone that wasn't proven already". Proof still needs every required mode and one code result, so a single practice answer rarely completes it. **Not changed; owner decision** (Q3 below).
2. **The day boundary is UTC, not Asia/Manila.** `today()` in `daily.ts` and the AI-use limit both use UTC midnight, so the day's set turns over at 08:00 Manila time. The proposal asks for the owner's timezone and also says not to change stored dates silently. **Not changed; owner decision** (Q4).
3. **Term lookup was only hidden on the assessment page** during a run; the server still answered it everywhere. **Fixed:** the lookup route now refuses while a run is open, and Engineering pages hide the Explain button.
4. **Course shows the legacy 1 Oct "solid" as "Known".** Display only: prerequisites and the Planner use `isKnown`, which ignores it. Kept until the retirement removes the legacy summary.
5. **Topic steps:** the proposal's topic stages are Learn, Exercise, Prove. The owner-agreed UI (`engineering-lab-ui.md`, 2026-10-02) has four steps, Learn, Practice, Lab, Check, kept in `?step=`. See decision D3.
6. **Words:** the proposal names the tabs Overview, Profile, Learn, Practice. "Learn" and "Practice" are also two of the four topic step names in the word list. See decision D4.

## 2. Decisions made while building

| # | Question | Decision | Why |
|---|---|---|---|
| D1 | Prototype styling (Inter, indigo accent, blue rails) or Ken OS? | **Ken OS tokens and type.** The prototype decides layout, anatomy and density only | The proposal says "do not create a second design system"; Inter and a purple-blue accent are also on the owner's avoid list |
| D2 | Module name | **Engineering** in the sidebar, search and title; `engineering-lab` stays in code, tables and APIs | Proposal §1; a cosmetic rename doesn't touch the database |
| D3 | Topic stages | **Keep the four agreed steps.** In the proposal's terms, Exercise is Practice plus Lab, and Prove is Check | The step bar was agreed with the owner and is tied to `steps.ts` and the Today card; merging predictions into labs would lose a distinction the owner asked for |
| D4 | Tab names that collide with step names | **Use the proposal's tabs.** The Practice page is titled "Today's practice"; inside a topic, step names stay | The tab bar and the step bar never appear in the same place; recorded as Q2 for sign-off |
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
| Shell | Module renamed Engineering; sections are the four tabs; a sticky tab bar on phones |
| Closed book | `app/api/terms/lookup/route.ts` refuses while a run is open; Engineering pages hide Explain during a run |
| Profile view | `getProfileView` also returns `progress` and `baselineChapterStates`, so the table uses the same replay as the levels |

Notes:

- **Level words.** The table says "Known" for a placement-style pass and "Proven" for `VALIDATED`. In-app baseline answers can prove a topic when they cover every required mode with a code check (as `computeProgress` already did); lab-only topics can only become Known from a baseline. The evidence page names the attempt kind, so provenance stays visible.
- **The evidence page's "Record" section** shows the question version and model behind a collapsed toggle. The app-language rule keeps model and prompt details off screens; this is the one place they appear, because the handoff asks for traceable grades and the record is content, not frame.
- **The prototype's Rail** became `LevelRail`: three segments in the foreground colour, hatched for an estimate, the target outlined in dashes, with the level in words underneath.
- **The Skyline home (`lab-today.tsx`) is no longer routed.** It stays for the `design-preview?view=lab` mockup and is deleted with other redundant UI once the redirects are permanent (proposal §13, phase F).

Checks run:

- `pnpm test`: 180 pass (169 before, plus 7 projection and 4 route tests). Includes the app-language scan of the new screens.
- `tsc --noEmit` and `next build`: pass. All nine `/engineering` routes and six `/lab` routes build.
- Local Postgres: `test:db:engineering` (new), `test:db:profile`, `test:db:lab`, `test:db:terms` pass.
- Dev server: each `/lab` page returns 307 to its Engineering page with the query kept; signed-out Engineering pages redirect to sign-in.
- Browser, through `/design-preview` (`view=engineering`, `engineering-profile`, `engineering-evidence`, `engineering-learn`): desktop at 1440 and 1487 wide, and phone at 390 wide with no horizontal scroll and the tab bar marking the current page.

## 5. Not verified

- **Production state.** The Vercel connection returned 403 for the `jkengers-projects` scope, and the Neon connection lists no Ken OS project, so neither the deployed commit nor whether a baseline run exists could be read.
- **Signed-in pages.** Google sign-in can't be done by an agent, so the real pages were not opened signed in. The screens were checked through `/design-preview` with preview data.
- **Visual comparison with the prototype's source image.** The design package references `generated_images/exec-…png`, which isn't in the zip, so no image-to-render comparison was possible.
- **`pnpm check` on Windows** reports the design-system files as stale because the checkout has CRLF line endings (`core.autocrlf=true`). TypeScript and the lab-content check pass on their own; CI on Linux is the real check.

## 6. Waiting on the owner

1. **Take the baseline** at `/engineering/profile/assessment`. An agent must not answer it. Then the legacy-baseline retirement in [engineering-lab-profile.md](engineering-lab-profile.md) §8 can happen as its own change.
2. **Q1:** confirm D1 (Ken OS look over the prototype's Inter and indigo).
3. **Q2:** confirm the tab names in D4, or rename the tabs or steps.
4. **Q3:** should daily practice on an unproven topic stop counting as proof (store it as `lesson`-like practice instead)? Today it counts like a Check question.
5. **Q4:** move the practice day and AI-use limit to Asia/Manila? Existing daily sets keep their UTC dates either way.

## 7. Still deferred, as the proposal says

Knowledge debt, grade disputes, loop health, chapter mixed checkpoints, Obsidian export, real parallel database labs, drafts across devices, idempotent submission ledger, a generic response envelope, and permanent redirects.

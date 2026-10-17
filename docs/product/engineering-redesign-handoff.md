# Loots Engineering — architectural redesign handoff

Date: 2026-10-06 · Status: implementation proposal, ready for repository reconciliation.
Owner: John Kenneth Gervacio.
Selected UI: first displayed light Evidence Workbench option in Ken-OS-Engineering-Design.zip.

## 1. Objective and scope

Turn the existing Engineering Lab into Loots' Engineering module: a living, evidence-backed profile connected to assessment, learning, retention and project work. Expose four surfaces—Overview, Profile, Learn, Practice—while keeping the existing learning engine.

This is an incremental refactor inside Loots, not a replacement application. Reuse owner auth, PostgreSQL/Drizzle, domain functions, agents, authored content and runners. Keep internal `engineering-lab` directories and `lab_*` tables initially. The public navigation name becomes Engineering. A cosmetic rename must not trigger a database rewrite.

First release: shared shell; real intake and assessment; direction and evidence profile; integrated topic workspace; existing daily practice; compact overview. Knowledge debt is a later release after real use validates the learning loop. Existing radar may be surfaced if its deployed implementation is verified; do not make it a dependency for the core release.

This document authorizes design preparation, not production deployment, destructive database changes, model purchases or external-code upload. Implementation should follow existing repository instructions and session authorization.

## 2. Authority, evidence and unresolved inputs

Source bundle read for this handoff:

- `engineering-lab.md`: current decisions, source packets, runners and 2026-10-05 content expansion.
- `engineering-lab-v0.md`: original architecture and as-built corrections.
- `engineering-lab-v1.md`: feature status as of 2026-10-06 and deferred proposals.
- `engineering-lab-profile.md`: profile, assessment, role definitions and as-built corrections.
- `UX-HANDOFF.md` in the design package: proposed screen flows and frontend limitations.

Use latest dated decisions and as-built sections over older proposal paragraphs. The module's original product handoff and Loots product brief remain governing sources in the real repository. They were referenced by the attachments but were not supplied here. Neither was `engineering-lab-ui.md`, `topics.yaml`, `roles.yaml`, source code, migrations or repository `AGENTS.md`. Read them before changing code. Report concrete conflicts instead of assuming this proposal silently supersedes unseen requirements.

This handoff changes information architecture and recommends application contracts. It preserves existing evidence rules unless an explicit resolution below says otherwise. Proposed paths, interfaces and tables are not claims about live implementation. Repository reconciliation must identify actual equivalents.

The generated mock is a visual target, not a factual learner profile. Its Mid/Junior values, target coverage and dates are illustrative. The prototype's five-question assessment, hardcoded levels, manual demo proof confirmation, localStorage, simplified code runner and incomplete topic content must never become production logic. Browser visual verification was blocked by URL policy; `design-qa.md` records that limitation. Build success is not UX acceptance.

## 3. Current system and reuse decisions

The attachments report 52 topics, 13 chapters, two tracks and 48 authored labs. Verify those totals in the repository; do not infer one lab per topic, since labs may cover multiple topics. All current chapters are written; screening-only chapters now apply to newly approved additions.

| Existing capability                         | Evidence in attachments                                         | Redesign treatment                                                   |
| ------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------- |
| Owner auth, shared DB, agents package       | Engineering already a Loots module                              | Reuse unchanged                                                      |
| Topic map and authored labs                 | Full course reported built                                      | Reuse IDs, prerequisites, test harnesses and starters                |
| Source packets and Tutor                    | Built                                                           | Reuse; expose sources within topic details                           |
| Assessor, grader and executable predictions | Built                                                           | Reuse separate prompts, fingerprints and evidence records            |
| Deterministic progress and Planner          | Built                                                           | Reuse; compose view models around outputs                            |
| Placement checks                            | Built                                                           | Retain as contextual “Check what I know” action                      |
| Profile, intake, baseline run               | Built in profile branch; real baseline pending                  | Reconcile merge/deploy status and reskin; do not rebuild blindly     |
| Role definitions                            | Approval reported 2026-10-05                                    | Reuse approved requirements and disclosure notes                     |
| Daily practice                              | Built, paused during assessment                                 | Reuse scheduling, stored set and review submission                   |
| Skyline home and tabbed Workbench           | As-built UI                                                     | Replace presentation with selected light Profile and four tabs       |
| Roadmap rail and pace estimates             | Built                                                           | Embed chapter path in Learn/Profile; no dedicated roadmap page       |
| Weekly radar                                | Profile document reports built; deployed verification uncertain | Surface verified existing service; no invented news                  |
| Knowledge debt                              | Explicitly not built                                            | Defer; local processing boundary retained                            |
| Grade disputes and loop health              | Not built                                                       | Small evidence feedback affordance later; diagnostics under Settings |
| Chapter mixed checkpoints                   | Not built; checkpoint now means whole-profile retake            | Do not add in this redesign                                          |
| Obsidian note export                        | Suggestions exist; copy action not built                        | Optional contextual export after core loop                           |
| Real parallel DB lab service                | Not required by current runners                                 | Defer; no new paid infrastructure                                    |

Deployment status is not fully established: v0 is reported live, profile branch historically not deployed, later decisions report it built. Verify commits, migrations and production state separately. “Built” does not mean merged, migrated or exercised end to end.

## 4. Product and route structure

| Public surface | Responsibility                              | Secondary content                                    |
| -------------- | ------------------------------------------- | ---------------------------------------------------- |
| Overview       | One useful next action                      | Practice summary, project gaps, relevant radar       |
| Profile        | Current evidence, target and next milestone | Direction, evidence, assessment history, definitions |
| Learn          | Role-filtered chapter path and all topics   | Topic workspace, prerequisites, sources              |
| Practice       | Stable daily mixed review                   | Feedback, pause/resume and summary                   |

Assessment is a Profile journey, not a fifth navigation item. Topic learning/exercise/proof is one workspace. Evidence, sources, history and role definitions are drawers/dialogs or nested detail routes. Heavy evidence detail must support a deep link, not depend exclusively on a transient modal.

Proposed page routes:

```
/engineering                         Overview
/engineering/profile                 Profile
/engineering/profile/direction       Direction conversation and confirmation
/engineering/profile/assessment      Start/resume assessment and intake
/engineering/profile/assessment/:runId/results
/engineering/profile/evidence/:attemptId
/engineering/learn                   My path / All
/engineering/learn/:topicId           Learn / Exercise / Prove
/engineering/practice                Daily set / resume / summary
```

Use the actual Next.js App Router segment conventions during implementation. Retain stable topic IDs in URLs, not display titles. Topic step belongs in a URL query such as `?step=exercise`; invalid or unavailable steps resolve to a valid session state. Use browser history and deep links; the prototype's state-only navigation is not suitable for integration.

Legacy page mapping, after verifying actual paths:

- `/lab` → `/engineering`
- `/lab/profile` → `/engineering/profile`
- `/lab/assessment` → `/engineering/profile/assessment`
- `/lab/practice` → `/engineering/practice`
- `/lab/topics` or actual Course route → `/engineering/learn`
- Existing topic URLs → `/engineering/learn/:topicId`, preserving query and resume identity.

Use temporary redirects during rollout; make them permanent only after rollback window closes. Retain `/api/lab` contracts initially. Page naming does not require moving mutation endpoints. Do not redirect legacy POST requests; keep handlers compatible or delegate internally.

## 5. Architectural boundaries

| Layer                | Owns                                                                                        | Must not own                                             |
| -------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Repo content         | Topic/chapter map, approved role requirements, authored labs/tests                          | Mutable learner progress                                 |
| Domain               | Progress, known eligibility, depth, profile projection, prerequisite rules, daily selection | Model calls, SQL, UI state                               |
| Agents               | Research, teaching, independent assessment/grading, direction guidance                      | Direct level assignment, automatic curriculum edits      |
| Application services | Authorized operations, transactions, generation coordination, view-model assembly           | Duplicate mastery formulas in React                      |
| Persistence          | Attempts/snapshots, runs, current projections and drafts                                    | Invented proof inferred from navigation                  |
| UI                   | Four surfaces, editing, feedback, inspectable evidence                                      | Trusted scoring, manual real passes                      |
| Browser runners      | Execute bounded authored work and collect observations                                      | Owner credentials, authoritative multi-user attestations |

Keep existing `packages/domain/src/engineering-lab` and `packages/agents/src/engineering-lab`. Add application adapters alongside the current feature/server conventions discovered in Loots. Compose reusable UI in the shared component system; do not import the prototype wholesale or create a second design system.

Recommended application boundaries (names are proposals):

- `getEngineeringOverview(owner, now)`
- `getEngineeringProfile(owner, requirementVersion)`
- `getLearningPath(owner, role, now)`
- `getTopicSession(owner, topicId)`
- `startOrResumeAssessment(owner, kind)`
- `submitAssessmentAnswer(owner, submission)`
- `submitTopicEvidence(owner, submission)`
- `getOrCreateDailySet(owner, localDate)`
- `saveDraft(owner, draft, expectedRevision)`

Use one current-progress calculation everywhere: dashboard, profile, prerequisites, Learn and Practice. Views may display different detail, but cannot disagree about Known status or next action.

## 6. Vocabulary and evidence invariants

### Presentation mapping

| Internal value  | UI label               | Meaning                                         |
| --------------- | ---------------------- | ----------------------------------------------- |
| NOT_STARTED     | Not started            | No meaningful eligible work                     |
| LEARNING        | Learning               | Learning needed based on state/evidence         |
| PRACTICING      | Practicing             | Partial evidence; proof incomplete              |
| VALIDATED       | Proven                 | Requirements met under existing rules           |
| NEEDS_REVISIT   | Review                 | A later review or source change needs attention |
| solid           | Strong                 | Answer satisfies its rubric                     |
| partial / rusty | Partial / Needs review | Preserve exact distinction in evidence detail   |
| misconception   | Misconception          | Named incorrect mental model                    |
| gap             | Needs work             | Missing evidence                                |

Retain internal enums and stored labels. The UI label Proven may include placement-derived Known status, but evidence detail must say “Established by placement assessment” rather than pretending an executable lab was completed. Placement and full proof remain distinct provenance.

Hard invariants:

1. A read/open click never grants proof. UI step completion is not topic mastery.
2. Confidence is independent of grade. Require it for assessment/review; not for lessons or lab runs.
3. Attempts, question/rubric snapshots, lessons and source packets are immutable evidence. Fixes append a correction/adjudication record; they do not silently edit history.
4. A topic satisfies prerequisites only through the existing Known rules: proof or eligible placement/in-app assessment at sufficient depth. Self-report and legacy summary do not qualify.
5. Proof requirements, eligible modes, executable evidence and review effects come from the real domain implementation and approved topic map. Do not replace them with `tests passed && explanation nonempty`.
6. Daily practice can restore retention according to existing review rules; it cannot first-prove an unknown topic simply by collecting correct reviews.
7. Role direction changes requirements/path, not old grades. Overall level is capped by the weakest required area. Unknown is not Junior; estimates stay visibly qualified.
8. Requirements must be met at working/deep depth. Topic counts and years of experience are not seniority formulas.
9. A baseline snapshot stays fixed. Later evidence changes current profile; a checkpoint is a new assessment snapshot.
10. Code results and Assessor rubric results remain separately inspectable. An AI expectation cannot overrule executed output.
11. Source freshness and source change are separate: an expired packet alone does not prove underlying facts changed. Re-check flags need a validated change record linking old/new packets and affected claims.
12. Content suggestions and project usage never autonomously modify the curriculum or award proof.

### Resolve source contradictions

The older decisions say “baseline alone never makes Known.” Apply that to the imported 1 Oct chat summary (`gradedBy: baseline`), not to newly graded in-app answers. The newer profile document explicitly makes eligible all-solid in-app baseline answers behave as placement evidence. Preserve this provenance distinction in domain tests.

Older v0 says all proof modes must pass with at least one code result; newer profile as-built permits only predict/explain Assessor questions, often repeating the same type. These are not interchangeable assessment designs. Preserve the actual eligible placement/run rules; do not force a second distinct mode when only one is supported, and do not manufacture lab evidence from an explanation. Verify whether the current eligibility rules meet required depths. A missing executable requirement remains missing for full proof.

Older profile prose suggests topic-level areas; as-built uses chapter-level areas and splits React/API chapters. Preserve chapter ownership unless actual content proves it inadequate. Do not add redundant area columns merely to implement outdated prose.

Retain existing Planner priorities (reviews, continuation, prerequisite redirects, next eligible topic). The proposed dominant Continue card displays its actual recommendation, including a review if that is urgent. Do not hide priority work to keep the mock's CTA text.

## 7. Assessment and topic lifecycles

### Full-profile assessment

Proposed normalized application states: intake → preparing → answering → grading → ready-to-continue → completed; resumable failures retain their last durable state. Map to existing run enums rather than migrating solely for these names. Paused can be a resume condition rather than a new stored enum.

Create or resume one active run. Snapshot its curriculum and approved role-framework version, assessment configuration and prompt/model metadata. Freeze required scope at run start; newly added chapters do not expand an already-running baseline. Eligible existing proofs are listed as skipped with evidence IDs/depth. Intake remains non-evidence.

Generate chapter questions once within the existing allowance, persist before display, adapt per topic from grades and retain the question plan. Adaptive generation means total questions can change: show chapter progress and current item, not a fake fixed 54-question count. Full course now exceeds old 18-topic assumptions; compute scope from content. Do not promise 45–60 minutes without measured history.

Submission sequence:

1. Authorize owner, run/item ownership and active state; validate response and confidence.
2. Lock submitted answer and persist a pending submission under an idempotency key.
3. Execute/check predictions only after lock; assess explanations against the stored rubric.
4. Validate grader output; persist immutable graded attempt and update domain projection atomically.
5. Mark item resolved, apply adaptive next-item rules, return feedback and saved cursor.
6. Complete only when every required chapter is resolved/skipped; atomically publish an immutable snapshot and baseline designation.

If generation/grading fails, retain the locked response and retry that operation; do not unlock answers or pay twice silently. An invalid expected-output item is marked invalidated with reason, replaced under a new identity, and never counted as a wrong learner response. Completion races must produce exactly one completed baseline per owner.

During an active assessment hide lessons, term lookup and Go deeper across the module and pause daily practice as already specified. This is an application mode boundary, not merely hidden links on one screen. No timer. Preserve existing prediction “why” handling: save separately, not automatically graded; explanation questions have their own rubric.

Checkpoint means a full reassessment with new questions and baseline comparison. Verify existing handling of already-proven topics during retakes; retain it until an explicit alternative assessment policy is approved. Do not introduce chapter checkpoints under this name.

### Topic session

Learn, Exercise and Prove are UI stages, not replacements for attempt kinds. Preserve `lesson`, `assessment`, `placement`, `baseline`, `checkpoint`, `review` as actually implemented. Runner submissions retain existing classification/proof eligibility; inspecting a lab button must not change its attempt semantics.

Allow “Check what I know” before a lesson through the existing placement check. A pass satisfies only allowed placement requirements. A failure diagnoses where to start; do not remove unrelated earlier proof.

Track lesson/editor drafts and current stage separately from mastery. Run authored tests with the existing harness, preserve results and failure feedback, expose solutions only under existing pass/give-up policy. Revealed/practiced content cannot masquerade as independent unseen assessment. Assessor receives source packet and fingerprints, not Tutor lesson/exercise answer text.

Profile updates follow eligible evidence, not a final green UI animation. A successful workspace response includes what changed, what remains and the next domain recommendation.

## 8. Domain view contracts

These TypeScript shapes describe application projections, not new database schemas. Adapt naming to current types; avoid duplicating existing types.

```ts
type EvidenceLevel = "unknown" | "junior" | "mid" | "senior";
type EvidenceQualification = "confirmed" | "estimated" | "incomplete";
interface RequirementView {
  id: string;
  chapterId: string;
  requiredDepth: "aware" | "working" | "deep";
  state: "met" | "missing" | "review";
  topicIds: string[];
  evidenceIds: string[];
  reason: string;
}
interface AreaView {
  areaId: string;
  currentLevel: EvidenceLevel;
  qualification: EvidenceQualification;
  targetLevel: EvidenceLevel;
  requirements: RequirementView[];
}
interface ProfileView {
  hasCompletedBaseline: boolean;
  baselineRunId: string | null;
  latestCompletedRunId: string | null;
  chosenRoleId: string | null;
  roleRequirementsVersion: string;
  curriculumVersion: string;
  overallLevel: EvidenceLevel;
  areas: AreaView[];
  nextRequirement: RequirementView | null;
  computedAt: string;
}
interface NextActionView {
  kind: "assessment" | "review" | "continue" | "prerequisite" | "new";
  topicId: string | null;
  runId: string | null;
  step: "learn" | "exercise" | "prove" | null;
  reason: string;
  estimatedMinutes: number | null;
}
interface TopicSessionView {
  topicId: string;
  uiStatus: "Not started" | "Learning" | "Practicing" | "Proven" | "Review";
  knownOrigin: "proof" | "placement" | "inAppAssessment" | null;
  lessonId: string | null;
  currentStep: "learn" | "exercise" | "prove";
  requiredEvidence: RequirementView[];
  assessmentModeLocked: boolean;
  revision: number;
}
```

Do not render readiness as a percentage. If useful, show “3 requirements remain” with the exact list and target scope. Role distances remain deterministic counts at required depth. Pace uses existing defaults (3h working, 5h deep, 4h unwritten, switching to personal average after three proofs), labeled estimates; retain these until evidence supports a change. Exclude paused idle time from new duration instrumentation.

## 9. Storage strategy and minimal changes

Reuse `lab_source_packets`, `lab_lessons`, `lab_assessments`, `lab_attempts`, `lab_progress`, `lab_progress_changes`, `lab_profile`, `lab_assessment_runs`, `lab_chapter_screens`, `lab_daily_sets`, `lab_radar_items` where they exist. Keep curriculum, roles and labs in reviewed repo files.

Proposed additions only if equivalent fields/tables do not already exist:

| Need                            | Minimal representation                                                        | Retention/constraint                                                    |
| ------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Immutable assessment profile    | Run-linked JSON snapshot, stored on run or dedicated snapshot table           | Unique run; include evidence cutoff and content/role versions           |
| Draft and resume across devices | `lab_session_drafts` or equivalent existing draft storage                     | Owner + scope + scopeId + itemId unique; optimistic revision            |
| Idempotent pending grading      | Existing submission ledger, otherwise `lab_submissions`                       | Owner + idempotency key unique; pending/completed/failed; response hash |
| Auditable source re-check       | Existing change/flag record or additive record                                | Link old/new packet and affected topics; deduplicate flag               |
| Versioned direction             | Existing profile version field; append change record only if history required | Direction writes compare expected revision                              |
| Later knowledge debt            | `lab_debt_items`                                                              | Deduplicate project/range/concept; source provenance retained           |

Draft shape: owner, scope (`assessment-answer` / `topic-code` / `topic-answer`), scope identity, item ID, payload, revision, updatedAt. Server session determines owner; clients cannot supply authoritative `user_id`. Debounced autosave shows Saving/Saved/Conflict. On conflict fetch current draft and offer compare/keep choice; do not overwrite newer work. Drafts are mutable and never evidence until submitted. Keep payload limits and retention from existing platform rules.

Profile current state is derived. Assessment snapshots are historical. Role-framework edits recompute current requirements but must not rewrite old snapshots. Add version identifiers or content hashes only where missing. No new scores or generalized learning-platform schema is needed.

Enforce database constraints plus transactions for unique question responses, one completed baseline, one stable daily set per owner/day, and unique projection rows. Freeze submitted response while grading outside a long-lived DB transaction; then finalize with compare-and-set and atomic progress changes. Do not hold row locks during network model calls.

Daily date uses the owner's configured timezone (John: Asia/Manila), not server UTC. Existing review-date behavior must be preserved and documented; avoid silently changing stored dates during the UI migration.

## 10. Application/API contract plan

Keep actual existing APIs and adapt their responses to the new UI wherever possible. The operations below are contracts to reconcile, not a mandate to create 20 new endpoints. Existing server actions are acceptable if they preserve the same validation, idempotency and error semantics.

| Operation                  | Inputs                                                               | Output / side effect                                          |
| -------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------- |
| Read Overview/Profile/Path | Authenticated owner, selected role/filter                            | Composed domain projections; no paid generation on GET        |
| Read topic/evidence/run    | Stable identity, owner context                                       | Authorized session or snapshot, no private answer-key leakage |
| Save intake/direction      | Validated context, approved role ID, weekly hours, expected revision | Profile preference update; no new evidence                    |
| Start/resume run           | baseline/checkpoint + idempotency key                                | Existing active run or new frozen scope                       |
| Prepare chapter            | Run ID, chapter ID, operation key                                    | Persisted item set / pending generation / allowance error     |
| Save draft                 | Scope/item, payload, expected revision                               | New revision / conflict                                       |
| Submit answer              | Run/item, response, confidence, idempotency key                      | Locked submission ID, processing state or persisted result    |
| Retry grade                | Submission ID                                                        | Resume same locked response; audited retry                    |
| Submit executable evidence | Topic/lab/version, response/code, bounded run observations, key      | Validated attempt, provenance, updated projection             |
| Request independent proof  | Topic ID, requested eligible modes, operation key                    | New stored questions with independent rubrics                 |
| Daily set                  | Server-derived owner local date                                      | Stable set; create generation only through explicit mutation  |
| Submit daily item          | Set/item, response, confidence where required, key                   | Review attempt and updated review date                        |
| Later ingest concepts      | Scoped capture identity, repo alias, hashes, concept IDs             | Suggestions/debt only; no raw code                            |

Proposed response envelope:

```ts
{ data: T, revision?: number, operationId?: string }
// or
{ error: { code: string, message: string, retryable: boolean,
           retryAfter?: string, submissionId?: string } }
```

Error classes: invalid input, unauthenticated, forbidden, missing item, stale revision, duplicate payload mismatch, assessment active, generation exhausted, source preparation failed, runner result invalid, grading unavailable. Map to existing HTTP conventions; validation 400/422, ownership 403 or concealed 404 per platform, conflict 409, exhaustion 429, unavailable 503. A repeated identical idempotent submission returns its saved result, not a second grade. Reusing a key with a changed response is a conflict.

Never send hidden solutions, rubric answer keys or private run records before the allowed feedback phase. Fetching another owner's IDs must fail at the service boundary even if all current access is owner-only.

## 11. Agents, costs and runner trust

| Component                      | Inputs                                           | Allowed output                                  |
| ------------------------------ | ------------------------------------------------ | ----------------------------------------------- |
| Researcher                     | Topic + allowlisted source groups                | Validated dated packet; no teaching/grading     |
| Tutor                          | Packet + actual evidence gaps and misconceptions | Lesson snapshot + cited content; no proof       |
| Assessor/generation            | Topic + packet + prior-item fingerprints         | Independent items and rubrics                   |
| Grader                         | Locked response + stored item/rubric             | Structured label/feedback, validated by code    |
| Direction Guide                | Non-evidence context + computed role distances   | Suggestions; explicit confirmed profile changes |
| Planner/progress/profile/daily | Content + attempts + timestamps                  | Deterministic recommendations and projections   |

Retain Guide conversation from the profile architecture. The prototype's form is a fallback input mechanism, not a decision to remove guided intake/direction. Guide cannot grade or approve its own suggested chapter changes. Explicit user confirmation applies to direction/profile changes where current Guide rules require it; deterministic UI Save already expresses that confirmation.

Retain generation budgets reported by latest as-built source: daily 20, assessment one chapter call plus six retries (19 for 13 current chapters), radar separate allowance. Verify exactly which generation/grading calls each ledger counts. The outdated proposed AI-track increase to 40 is not accepted by this redesign. Reserve allowance atomically before a call, reconcile failures according to existing policy, track operation identity and actual usage; revisiting a GET never consumes a new call. No new premium model assignments are specified.

Do not replace existing data-URL opaque-origin runner with the prototype's Blob worker. Preserve worker termination, test limits, anonymous probes and PGlite setup. PGlite interleaving is not evidence of true parallel connection locking/isolation. Keep real parallel services deferred. Browser-submitted results are owner-local evidence under the existing trust model, not tamper-proof certification. Preserve the known limitation, validate payload/schema/version server-side, and re-score probes server-side if implementing that existing backlog item. No credentials in worker code; no solution disclosure before policy allows it.

## 12. Knowledge debt, after core release

Connect projects to engineering gaps without adding a project-analysis product now. Preserve the v1 local-only rule: process diff on the owner's machine and send only concept IDs/names, repo alias and commit range. “Local AI call” must mean an actual local/offline model or explicitly permitted processing; an API request from a local script still uploads code and violates this boundary. Do not silently substitute a cloud provider. A deterministic local classifier/manual concept selection is a valid initial fallback.

Known concept missing eligible evidence → open suggestion; user queues it → queued; user dismisses → dismissed; adequate proof at required depth → resolved. Review failures can reopen it as needing attention under a documented rule; old detection remains auditable. Unknown concept → suggestion requiring reviewed curriculum addition, never automatic YAML edits. Existing detection and dismissal identity prevents repeat notifications for the same range. No PR blockers, automatic external writes or enforced study interruptions.

## 13. Migration and rollback

### Phase A — repository reconciliation

Read AGENTS, product brief, original module handoff and UI doc. Locate actual branches/commits, routes, schema and tests. Produce a concise reconciliation note covering deployed status, existing API equivalence, evidence/depth rules, budget ledgers, baseline status, role approval version and unresolved discrepancies. Run relevant existing checks once to establish a baseline. Do not code against obsolete proposal paths.

### Phase B — additive shell and projections

Add `/engineering` pages behind the platform's existing feature-flag mechanism or minimal configuration switch. Reuse existing APIs/domain functions; compare old/new projection results for the same owner and attempts. Legacy pages remain accessible during verification. No evidence migration in this phase.

### Phase C — minimal additive persistence

Only add missing draft, snapshot, submission/version fields after inspection. Generate and review Drizzle migrations; apply to staging first. Backfill hashes/version provenance deterministically where reconstructable. Mark unavailable historical versions unknown; do not fabricate them. Store backup and verification queries before production migration. Current implementation scope must authorize any actual deployment separately.

### Phase D — complete real vertical slice

Reskin existing intake/assessment/profile; preserve run IDs, questions and submitted answers. Verify resumed pending runs remain valid. Complete a real baseline with owner participation; do not have an agent answer the owner's assessment. Then confirm the five baseline consumers use the new evidence: Tutor, Planner, Course/Learn, Topic, Overview.

Only after completed baseline and verified consumers, perform the existing retirement follow-up: remove legacy baseline file/parser/generated imports; rewrite topic gap text as teaching goals; update source-of-truth references and AGENTS consistently. Keep real attempts since 1 Oct. Distinguish imported legacy summary records and exclude them from real proof; do not drop all `kind=baseline` rows. Historical baseline cleanup must be reviewed separately because the original documents contain preservation rules.

### Phase E — topic and retention surfaces

Integrate existing Course/topic/runners/assessment components into Learn/Exercise/Prove, then daily practice and Overview. Reuse actual topic IDs and lab definitions, not the prototype's display-name arrays. Test legacy links and direct reload. A soft route migration does not alter attempt semantics.

### Phase F — switch navigation and stabilize

Enable Engineering navigation for owner; observe real failures, disputed grades and review retention. Once stable, convert page redirects to permanent. Delete redundant UI only after no live imports/deep links depend on it. Keep domain/table names and old API handlers unless a later cleanup has a concrete benefit.

Rollback: switch navigation/feature flag back to legacy pages. Additive schema and attempts remain usable by both presentations. Never roll back by deleting new owner evidence or restoring an older progress dump. Rebuild projections from retained attempts if needed. Delay destructive schema changes so rollback does not require data loss. UI rollback and legacy-baseline retirement are separate changes; retirement must not be casually undone by restoring context as proof.

## 14. Delivery slices and acceptance

| Slice                  | Work                                                     | Acceptance gate                                                                                  |
| ---------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 0 · Reconcile          | Actual code/status/constraints map                       | Existing capabilities located; contradictions documented                                         |
| 1 · Shell/Profile      | Four tabs, profile projection, evidence details          | Same real evidence produces same levels/depth as old UI; unknown shown honestly                  |
| 2 · Assessment journey | Intake, resume, grading, results, direction              | Durable progress; one answer per item; immutable real baseline; owner can finish across sessions |
| 3 · Learn/Proof        | Chapter path, placement, topic workspace, actual runners | Existing lab starter fails, solution passes; independent proof rules unchanged                   |
| 4 · Practice/Overview  | Stable daily set and next action composition             | Reviews update retention, practice pauses during run, dominant action matches Planner            |
| 5 · Cutover            | Legacy links, flag, baseline retirement when eligible    | Old links work; rollback retains evidence; no imported context counts as proof                   |
| 6 · Operate            | Real-use loop review and verified radar                  | Grade/retention issues addressed before project-gap automation                                   |
| 7 · Knowledge debt     | Local classification and concept ingestion               | No raw code upload; suggestions resolve only from eligible evidence                              |

Slices 1–2 are the first meaningful user release; do not build duplicate assessment services simply to fit this sequence. Where existing functionality works, reskin and integrate it.

## 15. Verification plan

Domain regression cases:

- Legacy summary solid does not satisfy prerequisites; eligible in-app all-solid answers do under placement rules.
- Missing required executable evidence does not become full proof from explanation confidence.
- A role/depth change affects requirements, not immutable attempts; unknown never becomes Junior by default.
- Review failure becomes Review and Planner redirect; practice cannot first-prove an unknown topic.
- Reordered chapter/area presentation does not change projection results.
- Source expiry is distinct from validated factual change; old proof remains dated and inspectable.

Database/application cases:

- Concurrent identical submissions create one result/change; mismatched duplicate key returns conflict.
- Grading failure retains the locked answer; retry resumes, not resubmits.
- One completed baseline, stable daily set under concurrent requests, owner timezone boundary.
- Cross-owner IDs denied; confidence validated only where required.
- Draft conflict preserves both versions; refresh/cross-device resume returns saved state.
- Snapshot includes curriculum/role/prompt provenance; unavailable historical versions are qualified.
- No paid generation on reads; concurrent allowance reservations respect cap.

Browser cases:

- First use → intake → real assessment → results → direction → profile.
- Partial run across refresh; existing proofs skipped/preserved; closed-book helpers disabled.
- Learn → placement or lesson → failing exercise → fix → pass → independent proof → projection update.
- Due practice → failure feedback → revisit, and finished set remains stable after reload.
- Direct old/new links, back/forward, 390px mobile, keyboard-only flow, modal focus trap/restore, visible focus, contrast and editor input.
- Compare selected Profile source and rendered implementation at matched viewport/state in one image comparison; fix P0/P1/P2. Check console errors. Current prototype QA remains blocked until rendered inspection is permitted.

Use actual repository commands after inspection. Attachments cite `pnpm test`, `pnpm --filter @ken-os/web test:db:lab`, `test:db:profile`, `lab:generate` and `pnpm db:generate`; verify names before use. Run targeted existing suites and meaningful regressions for changed contracts, not cosmetic snapshot tests that mirror markup. No production migrations or deploy are performed by this handoff.

## 16. Ready-to-use Claude Code instruction

> Implement the Loots Engineering redesign described here using the selected first/light Evidence Workbench design and the supplied design package. Begin by reading repository AGENTS, the original module handoff, product brief and latest as-built architecture. Inspect actual code, schema, approved roles, routes and deployment status; produce a reconciliation note before edits. Reuse existing domain functions, attempts, agents, authored labs, runners, baseline runs and daily scheduling. Preserve topic IDs and evidence provenance. Do not copy the prototype's demo grading, hardcoded levels, Blob worker, localStorage or manual proof pass into production. Deliver the shell/Profile and real assessment vertical slice first, with existing contracts adapted wherever possible. Then integrate Learn/Exercise/Prove and Practice/Overview. Keep changes additive, preserve legacy links and provide an evidence-preserving rollback. Defer knowledge debt and paid infrastructure. Explain exact changes, meaningful checks and remaining gaps. Do not answer the owner's assessment, silently retire baseline context before completion, or claim visual QA without matched browser evidence. Production deployment and external writes require the project's applicable authorization.

## 17. Completion record for this handoff

Prepared from supplied documents and selected design; no Loots repository was accessed or modified. No real competency assessment, grading call, database migration or production deployment was performed. Proposed contracts remain subject to repository reconciliation. The next action is Slice 0 in the actual Loots checkout, followed by adapting the existing real Profile/assessment implementation—not starting another standalone app.

# Engineering Lab profile and baseline

Status: **built on 2026-10-03, waiting on two owner steps** (see "As built" at the end): approving the role definitions, and taking the baseline. The retirement in section 8 happens after that. Every decision below was agreed with the owner in discussion on 2026-10-03. It extends the lab as built ([decisions](engineering-lab.md), [UI](engineering-lab-ui.md)) and slots in ahead of the [v1 proposal](engineering-lab-v1.md), reusing its daily practice (§9) and roadmap graph (§8).

## The short version

- **The lab as built stays.** Topics, lessons, labs, proofs, the Planner, Course and Today are unchanged. Only the foundation underneath them changes.
- **The foundation becomes a career profile:** what kind of engineer you are now, how senior per area, which roles you could grow into, and what's changing in your field.
- **A real baseline replaces the 1 Oct one.** You take an assessment inside the lab, and every question, answer and grade is saved. `baseline.yaml` and the handoff's sections 2–3 are retired.
- **Roles are directions, not a lock.** "Full-stack developer with applied AI, building my own products" is today's example. The assessment draws your shape, the profile shows how far you are from each role, and you pick and change direction over time.
- **Levels (junior, mid, senior) are per area and backed by proofs**, not by years or topic counts. The overall level is capped by your weakest area your role needs.
- **The lab home becomes two layers:** a Today strip (daily practice, Continue, one radar item) on top of the profile (levels, role distances, roadmap).
- **A weekly radar** flags new models and tech changes for your role as learn, experiment or explore, and flags proven topics whose facts have changed.
- **Built in four slices:** foundation, profile, daily practice, radar.

## 1. What stays and what changes

| Part | Today | After |
|---|---|---|
| Topics, lessons, labs, proofs, Planner, Course, Today | Built | **Unchanged** |
| Where you're headed | Not written down | **New:** a chosen direction, from roles stored as data |
| Where you started | `baseline.yaml`, copied from a chat on 1 Oct | **Replaced:** an in-app assessment with everything saved |
| How senior you are | One sentence in the handoff | **New:** a level per area, from evidence |
| The picture | Course outline | **New:** profile with levels, role distances and a roadmap |
| Tech changes | Researcher refreshes sources per topic | **New:** a weekly radar for your role |

The old baseline feeds five places today. The new baseline takes over the same five, so nothing downstream needs redesigning:

| Where | What it uses the baseline for | Code |
|---|---|---|
| Tutor | Doesn't reteach what you know; quotes your gap | `packages/agents/src/engineering-lab/tutor.ts` |
| Planner | Skips the lesson when the baseline says solid | `packages/domain/src/engineering-lab/planner.ts` |
| Course | "Known · skip" | `apps/web/src/components/lab/lab-topics.tsx` |
| Topic page | "Baseline on 1 Oct: …" | `apps/web/src/components/lab/lab-topic.tsx` |
| Today | "Your baseline is the starting point" | `apps/web/src/components/lab/lab-today.tsx` |

## 2. Roles, areas and levels

### Areas

Every chapter belongs to one of five areas. Each area gets its own level.

| Area | Chapters |
|---|---|
| Foundations | JavaScript runtime and async; HTTP and the browser |
| Frontend | React and API boundaries (the React half) |
| Backend and data | API boundaries; database transactions, concurrency and indexes |
| Production | Testing and web security; reliability; observability; architecture at scale |
| Applied AI | Retrieval; model interfaces; agents; AI in production |

Foundations is its own area because every role needs it and a gap there blocks everything above it. Five rather than more, so no area's level rests on a single chapter.

"React and API boundaries" is one chapter today but splits across two areas. Slice 1 either splits the chapter or tags each of its topics with an area; topics carry the area, chapters only group them.

### How deep: three plain levels

A role sets a target depth per chapter:

- **Aware:** you know it exists and when you'd need it.
- **Can build it:** you can put it into a product yourself. Maps to topic depth `working`.
- **Can run it:** you can debug it and keep it working with real users on it. Maps to topic depth `deep`.

"Can build" versus "can run" is the gap the lab exists to close: producing something versus reasoning about it once it's live.

### Junior, mid, senior

A level says what you can be trusted to own without help:

- **Junior:** builds features someone else has shaped.
- **Mid:** owns a feature end to end, from data to UI to deploy.
- **Senior:** owns a system in production: failures, scale, tradeoffs and the decisions others build on.

Each level, per area, is a set of chapters at a required depth. You reach a level in an area when those chapters are **Known** (proven or placed) at that depth. The overall level is capped by the weakest area your chosen role needs, so "senior" can't hide a production gap.

The exact chapter-and-depth sets per level are not invented here. See role definitions below.

### Roles

A role is a set of areas and chapters, each with a target depth, at a target level. Starting candidates:

- Frontend developer
- Full-stack developer
- Full-stack engineer
- Full-stack developer with applied AI
- AI product engineer

"Developer" versus "engineer" has no fixed industry meaning, so the lab writes down its own definitions and shows them on the profile.

**Who defines them:** the Researcher drafts each role and each level's requirements from published engineering career ladders, citing every source, and the owner approves before anything is used. They live in `content/engineering-lab/careers/roles.yaml` next to `topics.yaml`, and the profile links each requirement to its source.

### Estimates

Nine chapters aren't written yet, so their areas rest on screening answers only (section 4). Those levels are shown as **estimates**, drawn dashed or lighter, until written topics in the area are proven or placed. Estimates firm up on their own as chapters get written and you take their placement checks.

**Update, 2026-10-05:** every course chapter is now written, so a new baseline has no screened chapters and no estimates from them. Estimates now come only from chapters you add (section 3).

## 3. The conversation

Choosing a direction is a conversation, not a form. It happens in two parts, with the same agent:

1. **Intake, before the assessment (about 5 minutes).** What you build, what you use at work, AI work already started (the handoff lists embeddings, vector storage and HNSW), and how many hours a week you have. This steers where each topic's questions start and sets the roadmap's first pace estimate. **It never counts as evidence.**
2. **Direction, after the assessment.** It walks through your shape and your distance to each role, and you choose a direction together. You can come back and change it anytime.

The conversation may also **suggest chapters the course doesn't have** (payments, say, if your products need it). A suggestion is added to the outline as an unwritten chapter only after you approve it. A new chapter then gets its own short assessment; the baseline itself never moves.

**Boundaries:**

- A new read-only agent, separate from the Assessor, so whoever helps set your target never grades you.
- What you type is data, never instructions, like every other agent input in Ken OS.
- It writes only to your profile (direction, intake answers, approved chapter suggestions), and only on your confirmation.

## 4. The baseline assessment

### Scope

The assessment measures every area, because you haven't chosen a direction yet when you take it.

| Part | What's asked | Counts as |
|---|---|---|
| The 18 written topics | Adaptive, one or two questions each | Real evidence: grades topics, can make them Known |
| The 9 unwritten chapters | Two screening questions each: one on the basics, one applied | Estimates only: ranks chapters, never proves a topic |

Since 2026-10-05 every course chapter is written, so the second row applies only to chapters you add.

Topics already proven or placed before the assessment are **skipped**. A proof is stronger evidence than a screening question, and an off-day answer shouldn't put it at risk. The baseline lists them as "proven before the baseline".

At most about 54 questions (36 for topics, 18 for chapters), fewer for every topic you've already proven.

### Adaptive rules, per written topic

1. **Screening question**, in a mode the topic proves. A code-checked predict question when the topic has one, so at least one answer per topic is checked by running code. The intake can move which mode comes first.
2. Then, by its grade:
   - **Solid:** one confirming question in a second proof mode. Both solid makes the topic **Known**, the same as a passed placement check.
   - **Partial or rusty:** one probing question in another mode, to find what exactly is missing. That tells the Tutor where to start.
   - **Gap or misconception:** stop. The topic needs learning; more questions would only measure how much.

A topic's baseline label is **solid** only if every answer was solid; otherwise it's the label of the first answer that wasn't.

Unwritten-chapter screening questions are written from the chapter title and its planned topic names, without a source packet, and graded by the existing grader.

### Closed-book rules

- Lessons, Go deeper sections and term lookup (Explain / `E`) are hidden for the whole run.
- No timer. Speed isn't being measured.
- You rate how sure you are, 1 to 5, before every answer. It's tracked separately from the grade, as everywhere else in the lab.
- A prediction locks before its code runs.

### Sittings

- Resumable, chapter by chapter, over as many days as you like.
- Each chapter's questions are written in **one Assessor call**, from a separate allowance for the assessment, so a run doesn't eat the daily 20 generations.
- The profile appears only when every chapter is done. A partial profile would rank chapters against ones you haven't been asked about.

### What's recorded

Everything needed to re-check the result later, which is what the 1 Oct baseline couldn't offer:

- Every question exactly as asked, its rubric and expected output.
- Every answer, your confidence rating, the grade, the rubric results and the feedback.
- The Assessor and grader prompt versions and model.
- The intake answers, marked as non-evidence.

The profile has a "How this was assessed" view that lists all of it.

### Retakes

The first completed run is your **baseline** and never changes. Later you can retake the full assessment, with new questions, as a **checkpoint**. The profile shows each checkpoint against the baseline. That's the "objective before and after evidence" the handoff's success criteria ask for.

## 5. The lab home

The lab home has two layers.

**On top, the Today strip**, in this order:

1. Today's daily practice (section 6).
2. Continue: the topic and step you're on, as now.
3. One radar item worth trying this week (section 7).

**Below it, the profile:**

1. **Your levels.** One horizontal bar per area, marked junior, mid and senior. Each shows where you are now, your chosen role's target, and where you were at the baseline. Estimates are dashed.
2. **Role distances.** A short list of roles, each with "N chapters away" and the chapters it shares with the others. For example: "AI product engineer: 6 chapters away. Full-stack engineer: 4. They share 3."
3. **Roadmap.** The [v1 §8 graph](engineering-lab-v1.md), narrowed to your chosen role's chapters, with "you are here" and a pace estimate. Until you have real history, the pace comes from your weekly hours; after that, from how long your proven topics actually took.

No spider chart. It looks rich but distorts the comparison, because the shape changes with the order of the axes. Bars against marked levels make "mid in Backend, junior in Production" readable at a glance.

**Before the baseline exists**, the home shows one thing: start the intake and assessment, with how long it takes and that it can be paused.

The Ken OS home gets a small summary card (direction, overall level, today's practice done or not) that links into the lab.

## 6. Daily practice

Taken as designed in [v1 §9](engineering-lab-v1.md), with one change: it's the first item in the Today strip.

- About 15 minutes, four or five mixed items: predictions, one hands-on fix, short explanations.
- It picks, in order: reviews that are due, then stale proven topics, then open misconceptions, then a topic in progress.
- Answers count as reviews. No streaks or points; missing a day costs nothing.

Radar items stay out of the graded set. Trying a new model is exploring, not recalling.

## 7. Radar

**What it does:** once a week, the Researcher checks your chosen role's areas for new models, framework releases and changed best practice.

- Only the Researcher's trusted sites: official docs, release notes, provider changelogs.
- At most **5 items a week**, each tagged **learn**, **experiment** or **explore** with a one-line reason.
- Its own small AI budget, separate from the daily 20.
- Shown on the profile; the top item also appears in the Today strip.

**It only flags, with one automatic exception.** A new model or library stays a suggestion; you decide what's worth your time. But when a topic's refreshed source packet shows the facts behind a topic you've proven have changed, that topic gets an automatic **re-check** flag. Your proof was earned against the old facts.

## 8. Retiring the 1 Oct baseline

The owner chose to retire it fully. It happens in slice 1, after the first in-app run is complete, never before:

1. Delete `content/engineering-lab/learner/baseline.yaml`, `parseBaseline`, `baselineAttempts` and the generated baseline, and regenerate with `lab:generate`.
2. Point the five places in section 1 at the new baseline.
3. Rewrite each topic's `gap` in `topics.yaml` as what the topic teaches, without quoting the 1 Oct answers. Your personal gaps come from your answers instead.
4. Remove the handoff's sections 2–3 and replace them with a pointer to this doc. Update its other references to "the 2026-10-01 baseline" (§15, §26 rule 2, §27, §28) to mean the in-app baseline.
5. Update the two `AGENTS.md` rules: "Preserve its baseline assessment" and "Never edit `baseline.yaml` to reflect progress".
6. Real attempts recorded since 1 Oct stay. They're evidence; only the copied summary goes.

The 1 Oct record then lives only in git history.

## 9. Data (developer notes)

All new tables via `pnpm db:generate`, reviewed, then `pnpm db:migrate`.

- **`content/engineering-lab/careers/roles.yaml`:** roles, levels, required chapters and depths per level, and sources. Generated into the app like `topics.yaml`. Each topic gains an `area`.
- **`lab_profile`:** one row per user: chosen direction, weekly hours, intake answers (marked non-evidence), approved chapter suggestions.
- **`lab_assessment_runs`:** `kind` (`baseline` | `checkpoint`), status, the adaptive plan so far, prompt versions, started and completed times. Exactly one completed `baseline` run per user.
- **`lab_assessments.run_id`:** nullable link from a question set to its run.
- **Attempt kind `baseline`:** reused for run answers once the YAML kind is gone. In `computeProgress` it counts as proof and as placement (all solid makes a topic Known), and unlike `placement` it's allowed on any status except proven or placed, which the run skips. `baselineLabel` comes from these attempts.
- **`lab_chapter_screens`:** screening answers for unwritten chapters (run, chapter id, item, answer, confidence, grade, feedback). They have no topic, so they never enter `computeProgress`.
- **`lab_daily_sets`:** as in v1 §9.
- **`lab_radar_items`:** week, area, tag, title, reason, source URL, and an optional topic for re-check flags.

## 10. Build order

Each slice is usable on its own.

| Slice | What ships | Done when |
|---|---|---|
| 1. Foundation | Areas on topics; `roles.yaml` drafted by the Researcher and approved; intake; the assessment; the cutover in section 8 | You've completed a baseline run and the five places read from it |
| 2. Profile | The three pictures; the direction conversation; chapter suggestions; "How this was assessed"; the Ken OS home card | You've chosen a direction from real role distances |
| 3. Daily practice | v1 §9 in the Today strip | A day's set is stable across visits and its answers update reviews |
| 4. Radar | Weekly run, five items, re-check flags | A week's items appear with tags and sources, and a changed packet flags its proven topic |

The profile needs a baseline, and daily practice needs proven topics, so the order is fixed until slice 4, which nothing depends on.

## As built (2026-10-03)

All four slices are built on the `feat/engineering-lab-profile` branch. Checked with `pnpm test` (99 tests), `pnpm --filter @ken-os/web test:db:lab` and the new `test:db:profile` against local Postgres, and in the browser through the design preview (`/design-preview?view=lab`, `lab-profile`, `lab-assessment`, `lab-assessment&screen=intake`). Nothing is deployed, and no AI call has run end to end yet.

**Waiting on the owner:**

1. **Done 2026-10-05: approved `content/engineering-lab/careers/roles.yaml`,** expected to change along the way. Edits go through a reviewed commit that moves `approvedOn`.
2. **Take the baseline** at `/lab/assessment`. When it finishes, the app stops reading `baseline.yaml` on its own. Section 8's cleanup (deleting the file, rewriting topic gaps, editing the handoff and `AGENTS.md`) is then a follow-up change.

**Where it differs from the plan above:**

- **Areas sit on chapters, not topics.** "React and API boundaries" was split into two chapters, `m4-react` (Frontend) and `m4-api-boundaries` (Backend). Neither had written topics, so nothing moved.
- **The role definitions were drafted by Claude Code, not by the in-app Researcher.** They cite the public Dropbox engineering career framework (IC1 to IC3) for the level summaries. The chapter lists per level are a judgement call, and the AI area has no published ladder behind it. The file's `note` says so.
- **Most topics get the same question type twice.** Only predict and explain are open to the Assessor; the rest belong to labs, so the Assessor never stands in for a lab's test. A topic with one type gets a second question of that type, applied to a product scenario.
- **Screening tops out at "can build it".** Two solid screening answers put a chapter at "can build it"; one solid or two partly-right answers at "aware". "Can run it" always needs written topics proven or placed.
- **The roadmap is a timeline of chapter stages, not the v1 §8 graph.** A chapter the role needs deeper at a higher level appears twice (for example "can build it" for junior, then "can run it" for mid). Each stage lists its topics as status chips, and unwritten topics dashed.
- **Pace** starts at 3 hours per working topic, 5 per deep topic and 4 per unwritten topic, at your weekly hours. After three proven topics it switches to your own average.
- **The run's AI allowance** is one call per chapter plus six for retries (19 for the current course), separate from the daily 20.
- **The legacy summary keeps the kind `baseline`** with `gradedBy: "baseline"`; in-app answers use the same kind with real graders, so the two can't be confused.

**Data added** (migration `0009_lab_profile.sql`): `lab_assessment_runs`, `lab_chapter_screens`, `lab_profile`, `lab_daily_sets`, `lab_radar_items`, and `origin` plus `run_id` on `lab_assessments`. The attempt kind `checkpoint` was added.

**Pages:** `/lab` (Today strip and profile), `/lab/assessment`, `/lab/profile`, `/lab/practice`. The resume hub shows a one-line lab card.

**Home layout, chosen 2026-10-03 from a design exploration** (`/design-preview?view=lab-explore`, development only): the **Skyline**. One column per area, built up from junior to senior, with screening-only blocks hatched and the direction's target as a red line, beside a Today rail (practice, continue, radar). Under it, the road ahead as a rail with week and level points above the line (the ReUI timeline, copied into `components/ui/timeline.tsx`, MIT), then the distance to each role. It replaces the level bars and the vertical roadmap on the home. Report and Route were the other directions; weeks, area lanes, level gates, compact and segmented rails were the other road tracks. Both the home and the profile then moved to a **tight, bordered layout** (`components/lab/panel.tsx`) so the lab reads as a tool rather than a marketing page: a compact title bar with facts and actions instead of a hero headline, and content in bordered panels with small header strips. The **profile page is the Workbench**: the Guide in a pane on the left, and a tabbed pane on the right (shape, levels, roles, added chapters, radar, assessments, definitions), each scrolling on its own. The level table from the Report direction lives in its Levels tab. The assessment and practice pages get the same treatment next.

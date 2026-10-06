# Engineering assessment v2: conversational, two-stage, book-grounded

Status: **agreed with the owner on 2026-10-06; being built on `feat/assessment-v2`.** It changes how the intro and the assessment run, before the owner takes the in-app baseline. It extends [engineering-lab-profile.md](engineering-lab-profile.md) section 4 and [engineering-redesign.md](engineering-redesign.md). The Oct 1 baseline is retired only after the in-app baseline is complete, as before.

## Decisions (owner, 2026-10-06)

| # | Question | Decision |
|---|---|---|
| A1 | Rebuild or improve the intake and assessment? | **Improve.** Keep the run engine, adaptive rules, locking, code-checked predictions, separate grader, allowance and frozen baseline |
| A2 | Baseline length | **Two stages.** Two chapter questions first; then topic questions only where the chapter wasn't solid |
| A3 | When grades show | **After every answer**, as feedback in the conversation. Lessons and term lookup stay locked for the whole run |
| A4 | Intro | **Add "What would you like to grow toward?"** A starting preference for the Guide, never a direction or evidence |
| A5 | Feel | **Conversational, from an agent named "Assessor"**, inside the fixed framework below |
| A6 | Books | **Six books group the chapters**; each topic gets reviewed **assessment points** the Assessor writes from. Full book text comes later, section by section |
| A7 | Next.js foundations | **A new book after the baseline**, joining through placement checks |
| A8 | Smaller fixes | Write the next chapter's questions in the background; ground questions in a saved source packet when one exists; keep an unsent answer across a refresh; show questions left |

## The framework stays fixed

The code, not the conversation, decides: which chapter and topic come next, how many questions each gets, when a topic stops, the grade, and what counts as evidence. The Assessor phrases and responds; it cannot change a grade, skip a topic or end a chapter early. The Guide still never grades, and the Assessor never sets a direction.

## Two stages

1. **Stage 1, per chapter:** two questions written from the chapter's assessment points, one on the basics and one applied. Stored as chapter screens (they have no single topic, so they never prove one).
2. **Stage 2:** if both stage-1 answers are solid, the chapter is done and its depth is **"Can build it · estimate"** until its topics are proven or placed later. Otherwise each written topic in the chapter gets today's adaptive questions (a code-checked prediction first when the topic has one; a confirming or probing follow-up; stop on a gap).
3. Topics already proven or placed are skipped, as today.

## Conversation

- Each question arrives as an Assessor message that introduces it in a line or two, using the intro where it helps. The question itself is the stored item, unchanged.
- **One clarifying follow-up per question at most**, only when the answer is ambiguous. The owner's reply is appended to the same answer before grading, so nothing is graded twice. Follow-ups count against the run's AI allowance.
- After grading, the Assessor replies with the grade and the grader's feedback in sentences. No extra AI call for feedback.
- **"I don't know"** is a valid answer: recorded as a gap, and the conversation moves on.
- Confidence is still chosen before each answer, as quick chips.

## Books and assessment points

- `topics.yaml` gains a `books` list; each book groups chapters in order. Areas stay on chapters, so levels and roles don't change.
- Each topic gains 4 to 6 `points`: short statements a solid answer must show. The Assessor writes stage-1 and stage-2 questions and rubrics from them. `lab:generate` checks every written topic has them.
- Points are drafted by agents and reviewed by the owner in a reviewed commit.
- Books: Web foundations; React foundations; Backend and data; Production engineering; AI engineering. Next.js foundations comes after the baseline (A7).

## Build order

1. Grow-toward question, draft keeping, background question writing, source packets, questions left.
2. Per-answer feedback: grades visible as soon as an answer is graded.
3. Two-stage runs: domain rules, tests, run view.
4. Books grouping and assessment points (owner review before the baseline).
5. The conversational Assessor: agent, follow-ups, chat-style screen.

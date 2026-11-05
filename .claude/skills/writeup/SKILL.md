---
name: writeup
description: Use when the user asks to write up, recap, summarize, or document a work session, what was done today, or a batch of recently merged PRs, as a markdown file in docs/writeups/. Not for a maintained developer doc (see docs-guardian) or a pre-planned delivery retrospective tied to its own plan doc (see docs/writeups/apps-web-structure-cleanup.md for that heavier format) unless the user asks for that depth specifically.
argument-hint: "[topic] [date|branch prefix]"
---

A writeup is a point-in-time recap, written once and never updated — ground every line in git/GitHub, not in conversation memory, since a future run of this skill may have none.

## Steps

1. **Fix the scope.** Default: every PR merged into `main` today. If the user names a topic, branch prefix, or date range instead, scope to that. Ambiguous only when several unrelated topics merged the same day and it's unclear whether they're one writeup or several — ask then, not otherwise.

2. **Gather the real list.** `gh pr list --state merged --search "merged:>=<scope start>"`, or `git log --merges --oneline main` filtered to the scope. For each candidate, confirm it with `gh pr view <n> --json title,body,mergedAt` — merged, in scope, and its body is already the one-line summary written for it at the time; reuse that wording rather than re-deriving it from memory.

3. **Read the newest file already in `docs/writeups/`** for this project's current heading style, bullet punctuation, and whether a header block (`Plan:`/`Closed:`/`Result:`) is in use — match it rather than inventing a new shape. Two precedents on disk: `apps-web-structure-cleanup.md` (a delivery retrospective against its own plan doc — root-cause sections, a shipped-slices table) and `jobs-feedback-2026-11-04.md` (a plain session recap — no plan, straight into sections). Default to the plain recap shape unless a matching plan doc exists in `docs/architecture/` for this work, or the user asks for the deeper one.

4. **Group by work-stream, not chronological order.** Several PRs touching the same feature are one section. Each bullet is one line: what changed, then its PR number. A closing "Still open" section covers anything in scope that didn't merge or was explicitly parked.

5. **Name and write it**: `docs/writeups/<topic-kebab>-<scope end date, YYYY-MM-DD>.md`. Topic is user-named if they gave one, otherwise the shared theme across the PRs (a common branch prefix or feature area).

Done once the file exists, every bullet traces to a PR confirmed in step 2, and the shape matches the precedent chosen in step 3.

## After writing

Stop there. Only commit, branch, open a PR, or merge it if the user's own request already asked for that — this project's branch-per-task and merge-authorization rules (CLAUDE.md) apply exactly as they would to any other change; this skill doesn't loosen them.

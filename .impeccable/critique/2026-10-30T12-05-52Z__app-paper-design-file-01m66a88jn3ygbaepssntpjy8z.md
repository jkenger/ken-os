---
target: KEOS Jobs Paper mockups (5 desktop frames)
total_score: 28
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 2
target_identity: "url:https://app.paper.design/file/01M66A88JN3YGBAEPSSNTPJY8Z"
timestamp: 2026-10-30T12-05-52Z
slug: app-paper-design-file-01m66a88jn3ygbaepssntpjy8z
---

Method: design review only (Assessment B not applicable — target is a static Paper design-tool canvas, not shipped markup or a running app. The Jobs feature is "proposed... Not built" per docs/product/job-finder.md, so there is no DOM to scan with `impeccable detect` and no live page to inject the browser overlay into. This is not a skipped step; the mechanism has nothing to attach to.)

## Design Health Score

| #         | Heuristic                                   | Score     | Key Issue                                                                                                                                                                                                                                                                                                     |
| --------- | ------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1         | Visibility of System Status                 | 2         | Current location, row counts, and the selected row all read clearly, but no action (Dismiss, Save, Mark applied) shows a confirmation state, and there's no "last checked" / "last alert received" freshness signal anywhere — odd for a feature whose whole value is "shows up within a minute of arriving." |
| 2         | Match System / Real World                   | 3         | Labels are plain and task-named (New, Filtered out, Mark applied, Show anyway). "Setup / country" as one combined header reads slightly awkwardly.                                                                                                                                                            |
| 3         | User Control and Freedom                    | 3         | Dismiss and Close are correctly split in the panel header; Show anyway reverses a filter decision. No way to undo a Dismiss once it's gone, and nowhere to see what's been dismissed (see P1 below).                                                                                                          |
| 4         | Consistency and Standards                   | 4         | Badge, row, and button patterns reuse the shipped Loots components (Badge, DockedPanel, module shell) exactly — nothing invented.                                                                                                                                                                             |
| 5         | Error Prevention                            | 2         | Dismiss has no confirm step, which is fine for a reversible action, except it isn't reversible in this build (no Dismissed view to recover from).                                                                                                                                                             |
| 6         | Recognition Rather Than Recall              | 4         | Every action is a labeled word, not an icon; only the panel's Close is icon-only.                                                                                                                                                                                                                             |
| 7         | Flexibility and Efficiency                  | 2         | The spec calls for sorting by score or shift too, but the "Newest first" control is a plain pill with no caret or menu affordance, so it doesn't read as a dropdown. No bulk actions for triaging multiple rows at once.                                                                                      |
| 8         | Aesthetic and Minimalist Design             | 4         | Clean, restrained, nothing decorative; reads as a working tool, not a marketing surface.                                                                                                                                                                                                                      |
| 9         | Help Recognize/Diagnose/Recover from Errors | 2         | No designed states for the things the spec explicitly calls out: OnlineJobs checker Paused or Blocked until a date, a layout-change stop-and-email, or an empty Saved/Applied/Filtered-out tab. Only the happy-path "Running" state exists.                                                                   |
| 10        | Help and Documentation                      | 2         | No entry point to explain what Score or a shift label means on first encounter; the setup checklist doesn't link to how to actually add the Gmail filter.                                                                                                                                                     |
| **Total** |                                             | **28/40** | **Good**                                                                                                                                                                                                                                                                                                      |

## Design Specificity Verdict

**LLM assessment**: The chrome is unmistakably Loots — the graphite palette, Geist Mono score figures, the sidebar/section-list pattern lifted exactly from the shipped shell, and the DockedPanel built to the same spec as the Engineering roadmap's topic panel. None of that could be dropped into an unrelated product unchanged. The one place this slips toward generic is the job row itself: score, title, pay, type, setup, shift in a flat table is the default shape of basically every job board or ATS on the market. That's not wrong — the brief explicitly calls for a table — but it's the one surface here that doesn't yet have a Loots-specific idea beyond "mono number instead of a colored score band." Worth asking whether the row has room for one more distinctive touch (the brief's shift-hours-in-Philippine-time detail is a good start and already included).

**Deterministic scan**: not applicable (no markup/DOM exists for this pre-build mockup).

**Visual overlays**: not applicable, same reason.

## Overall Impression

This is a faithful, disciplined extension of an existing design system, not a fresh invention — and that's the right call for a module living inside the same product. The five frames read as one coherent surface. The biggest opportunity isn't visual polish; it's that the mockups silently drop one piece of the product's own data model (the Dismissed state) and skip every "something went wrong" state the spec explicitly asks for, which will read as gaps the moment this gets implemented.

## What's Working

- **Shell fidelity**: sidebar, breadcrumb, top bar, and account menu are pulled from the real `workspace-shell.tsx`, not reinvented, so this will drop into the app with near-zero translation cost.
- **The docked panel**: badges, facts, "why it fits"/"what's missing"/"from the posting" sections, and a sticky footer match `docked-panel.tsx`'s actual contract (ready state, close button, facts slot) — this isn't a look-alike, it's the same component used correctly.
- **Honest empty state**: Setup's "No postings yet" plus the 5-step checklist explains itself in two lines and one action, exactly per the project's own app-language rules — no tagline, no narrating.

## Priority Issues

**[P1] Dismissed postings have no home**

- **Why it matters**: The product's own data model (`job_matches`) has a Dismissed state alongside New/Saved/Applied/Filtered out, and the spec's core promise is "nothing disappears silently." Right now the section list only has New, Saved, Applied, Filtered out — a user who dismisses a posting from the panel has no tab to find it again, which breaks that promise for exactly the one state the feature invents.
- **Fix**: Either add a Dismissed section/filter, or decide (and document) that Dismiss is intentionally permanent and say so in the button or a confirm step.
- **Suggested command**: `/impeccable shape` (resolve the IA decision, then carry it into the mockup and `docs/product/job-finder.md`).

**[P1] No designed state for the failure modes the spec calls out**

- **Why it matters**: `docs/product/job-finder.md` explicitly describes an OnlineJobs checker that can be Paused or Blocked until a date, and that stops and emails the owner when the page layout changes. Settings only shows "Running." Without these states designed now, they'll get improvised at implementation time, inconsistently with the rest of the system.
- **Fix**: Design Paused and Blocked variants of the checker status row, plus an empty state for Saved/Applied/Filtered-out before anything is in them.
- **Suggested command**: `/impeccable harden`.

**[P2] Sort control doesn't read as interactive**

- **Why it matters**: The spec calls for sorting by score or shift, not just newest-first, but the "Newest first" pill has no caret, chevron, or other affordance signaling it opens a menu. A user scanning the page has no visual cue that sort is changeable at all — this is the "hidden navigation" cognitive-load failure (user must already know to try clicking it).
- **Fix**: Add a chevron or convert it to a visible select-style control consistent with the rest of the system's input styling.
- **Suggested command**: `/impeccable layout`.

**[P2] Every Filtered-out reason uses the same red, regardless of cause**

- **Why it matters**: The system's own rule is that colour is spent only on actual state (Learned/In progress/picked/destructive); routine preference filtering ("Below minimum pay," "On site") is expected behavior, not an error, yet it reads with the same urgency as something destructive. This slightly overstates severity for what the spec calls "hidden, not failed."
- **Fix**: Consider a neutral/muted treatment for routine strict-filter reasons, reserving red (if at all) for something the owner would actually want flagged as wrong.
- **Suggested command**: `/impeccable quieter`.

## Persona Red Flags

**Alex (Power User)**: Triaging a daily list of new alerts is the core loop here, but every action (Save, Dismiss, Mark applied) is one row at a time with no multi-select or bulk action. Alex will want to clear 8 low-score postings in one motion and can't.

**Sam (Accessibility-dependent)**: The panel's Close control is icon-only (✕) with no visible label, unlike Dismiss which is a text button right next to it — worth confirming at build time that Close carries an `aria-label`, since it's the one icon-only control on the surface. Everything else (score as a plain number, not a color band; every state paired with a word) is already built accessibly by design.

**Riley (Stress tester)**: Edge cases on the New list are well covered (Not listed pay, Partial score, every shift label) — but Saved, Applied, and an empty Filtered-out tab were never designed, so there's no answer yet for "what does a tab with zero items look like."

## Minor Observations

- "Setup / country" as a single combined column header is a slightly awkward merge; consider two narrower columns or dropping "country" from the label since the value itself already shows it ("Remote · US").
- The Settings page is one long flat stack of preference rows with no grouping beyond the three section cards — acceptable for an Operate-mode settings surface, but worth a second look once Shifts, Seniority, and timing fields (not yet drawn) are added; it could get long.
- "12 filtered out" and "12 new" are both static examples; confirm the real count updates correctly when the Filtered-out count differs from New (right now both happen to be 12, which could mask a wiring bug later if copy-pasted literally).

## Questions to Consider

- Is Dismiss meant to be a quieter, permanent "not interested" versus Filtered out's reversible "hidden by a rule" — and if so, should its button say something more final than "Dismiss"?
- Does the job row need one more Loots-specific idea beyond the mono score, given the rest of the layout is a fairly standard job-board table shape?
- Should "Newest first" actually be the default, or would most users want Score-descending as the default view for a feature whose entire point is matching quality?

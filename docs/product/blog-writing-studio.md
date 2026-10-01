# Blog Writing Studio — product spec

Status: scoped proposal, not implemented. Portfolio presentation is a later slice. This module extends the private Ken OS workspace with a public blog; it does not make Project Memory a publishing engine.

## Purpose

The owner wants a technical diary that helps him articulate what he built, explored, learned, and would do differently. The point is to develop and show **his own thinking**, not to turn commits or agent activity into AI-authored posts. A writing workspace should reduce the blank-page problem while keeping the editor, judgment, and final voice with the owner.

The first successful outcome: the owner starts from a useful outline, writes a private post in one focused screen, considers optional questions and inline edits, reviews exactly what will be public, and publishes a readable article. A public reader may compare the author's selected raw draft with the refined article only when the owner opts in for that post.

## Product principles

1. **The owner writes.** AI asks, critiques, and suggests; it does not silently replace prose, generate a complete first-person article from activity logs, or publish.
2. **Prompts, not forms.** Presets give a narrative arc and starter questions. Sections can be renamed, reordered, removed, or ignored without losing text.
3. **One writing surface.** The editor is primary; the assistant is a contextual side panel. On narrow screens it becomes an optional drawer, not a second page to manage.
4. **Interrupt sparingly.** Grammar and clarity suggestions may appear after a writing pause. An occasional question should help deepen an idea, not interrupt every paragraph. The owner can mute either mode.
5. **Private until deliberately public.** Drafts, AI context, and Project Memory stay private. Publishing and showing a raw draft are two separate affirmative choices.
6. **Facts are not voice.** Project Memory may later provide owner-requested, source-linked facts, but a receipt cannot supply the owner's opinion or authorize public disclosure.

## Starting outlines

The preset is a writing aid, not a content type or rigid document schema. Every new post can begin blank instead.

| Preset | Narrative arc | Starter question | Useful follow-up |
| --- | --- | --- | --- |
| A shift in understanding | Earlier assumption → challenge → current view | What would I have said about this a month ago? | What evidence changed my mind, and what is still uncertain? |
| An investigation | Question → trials and observations → open result | What was I curious enough to test? | Which result surprised me or contradicted my expectation? |
| A build story | Problem and constraints → pivotal choices → result and tradeoffs | Which decision made this project interesting? | What did that choice cost, and what actually shipped? |
| A retrospective | Intention → what happened → what I would change | Where did my process help or get in the way? | What will I try differently next time? |

Preset text appears as dismissible guidance beside or within an empty section, not as published filler. Switching presets changes guidance, not existing prose. The assistant uses the selected arc to choose relevant questions, but the owner can ask for a different angle.

## Writing workspace

- A private post list shows title, draft/published state, last edited time, and raw-visibility state. New post starts with a preset or blank page.
- The editor supports title, prose, headings, emphasis, lists, links, quotes, and code blocks. Image uploads wait for a deliberate media-storage decision. The document autosaves, shows saving/error state, and never claims a failed save succeeded.
- A side panel has two modes: **Questions** (occasional, contextual prompts; ask for another or dismiss) and **Suggestions** (grammar/clarity edits with original text, proposed replacement, and reason). Suggestions are visually anchored to relevant text where possible and require accept/reject. A stale suggestion cannot overwrite newer writing.
- Background feedback runs after an idle interval or explicit request, not for every keystroke. It is limited to the current paragraph or selected passage by default. It may not invent technical facts, accomplishments, measurements, or opinions. The owner can pause background feedback entirely.
- "Save raw draft" pins a private snapshot of the owner's chosen earlier text. This is a chosen draft state, not a keystroke log and not a guarantee of being AI-free. The owner can replace or remove it before publication.
- A preview shows the exact refined article and, if selected, the exact raw snapshot. The owner reviews both and explicitly chooses whether to expose raw for this publication. The default is **off for every post and every update**.
- Publishing is an owner-only action. Editing a published article creates a new draft; the public version stays stable until the owner publishes the update. Unpublishing removes public access without deleting the private draft or publication history.

## Public reading experience

- `/blog` lists only published posts; `/blog/[slug]` shows the refined version by default. Public routes never require Google sign-in and never reveal draft IDs, private notes, assistant exchanges, or Project Memory.
- When raw is enabled for that published version, readers can switch between **Refined** and **Raw draft**. Both are labeled clearly; raw is described as a snapshot selected by the author, not an AI-free authenticity certificate.
- Public content is rendered from a stored, immutable publication snapshot. Updating the private draft cannot change a live post accidentally.
- The public identity, eventual custom domain, and visual relationship to Ken OS are unresolved. The first slice can use the existing host and a distinct public layout without choosing the final brand or domain.

## First slice and exclusions

In scope: private post list and writing screen, four presets plus blank, durable autosave, one assistant with bounded questions and suggestions, explicit suggestion acceptance, raw-snapshot selection, preview, owner-only publish/update/unpublish, public blog index and article with opt-in raw/refined switch, and responsive/accessibility states.

Out of scope: portfolio pages, newsletter, comments, collaborative editing, scheduling, SEO automation, analytics, image uploads, custom outlines, transcript import, automatic conversion of receipts into posts, cross-project search, and autonomous publishing. These should be added only when a real writing/publishing need justifies them.

## Acceptance criteria

1. A draft survives refresh, logout, and redeploy; save failures are visible and unsaved local text is not silently discarded.
2. The owner can write a complete article without using AI or following a preset. Switching guidance never deletes prose.
3. Background feedback is controllable and does not move the cursor or change content. Accepting a suggestion changes only the verified target passage; a changed passage invalidates the suggestion.
4. An occasional question is relevant to the selected arc, can be dismissed, and does not appear during active typing. No answer is inserted into the article automatically.
5. A public route returns only the current published snapshot. Draft, raw snapshot, or prior publication content is not reachable publicly unless included in the current publication.
6. Raw is hidden by default for each publish or update. The publish preview shows exactly the raw snapshot that will become public when enabled.
7. Publishing and unpublishing require the owner session and mutation-origin protection. A signed-out visitor can read published posts but cannot access the studio or draft APIs.
8. The owner can revise a published post privately and publish a new version without mutating the existing public snapshot in place.

## Decisions to validate through use

- Does the owner prefer occasional questions in the side panel only, or a subtle in-editor cue that opens the panel? Start with a non-blocking side-panel cue.
- What cadence feels helpful? Start after a meaningful pause and cap unsolicited questions per writing session; measure dismissals before increasing frequency.
- Should raw/refined be a toggle or a side-by-side comparison on wide screens? Start with a toggle, with separate URLs or query state only if sharing a specific view becomes important.
- What public name/domain should appear? Defer until the first article design; do not couple content storage to the hostname.

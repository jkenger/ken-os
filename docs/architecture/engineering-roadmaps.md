# Engineering: several roadmaps at once

Status: proposed, 14 Oct 2026. Follows [engineering-progressive-flow.md](engineering-progressive-flow.md), section 6a, which named this as the next step. Decided in chat with the owner on 14 Oct 2026. [engineering-claude-first.md](engineering-claude-first.md) stays the source of truth for topics, states, Claude's tools and data, except where this spec changes them.

## Decision

Today a new roadmap archives the old one. After this, the owner keeps up to 3 roadmaps going at once, such as "AI engineering" and "System design interviews".

| Question                  | Decision                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| What a roadmap is         | Any goal, long or short. No separate "side track" type                                                  |
| How many active           | Up to 3. A finished roadmap still counts until archived                                                 |
| New or replace            | Two actions: **New roadmap** adds one; **Re-plan** replaces that roadmap, keeping its place and address |
| Moving between them       | A switcher on the page title; each roadmap has its own address                                          |
| Which one opens           | The one opened last, remembered on the server                                                           |
| Done with one             | Archive, never delete. **Restore** brings it back if there's room                                       |
| Before the first roadmap  | The role's default path, as today                                                                       |
| What Claude needs to know | Only the roadmap tools take a roadmap; topic tools are unchanged                                        |

**Progress belongs to topics, as before.** A topic on two roadmaps is Learned on both. Next topic, Chapter done and the summary are always worked out within one roadmap.

## 1. On the page

- **The title is a switcher.** It shows the roadmap's goal; opening it lists the active roadmaps with progress ("AI engineering · 5 of 14"), then **New roadmap**, then an **Archived** section. The default path shows as before until the first roadmap is saved.
- **Each roadmap has its own address:** `/engineering?roadmap=<id>`, with `&topic=<id>` to open a topic. Build it with `engineering.roadmap()` in `routes.ts`. Plain `/engineering` opens the roadmap opened last.
- **Opening a roadmap records it** as last opened (`last_opened_at`), so the page, the Profile line and Claude agree across devices.
- **Header actions:** **Re-plan** (replaces this roadmap) and **Claude setup**. **New roadmap** lives in the switcher. Both open the Ask Claude dialog:
  - New roadmap: "Plan a new roadmap with me. Start by checking where I am."
  - Re-plan: "Re-plan my roadmap <goal> (Ken OS roadmap `<id>`). Start by checking where I am."
- **At the limit,** New roadmap's dialog says "3 of 3 active · archive one first" instead of copying a message. Restore is refused the same way.
- **Archive** is in the switcher next to each roadmap and on a finished roadmap's summary, next to Plan next roadmap. Archiving the roadmap you're viewing opens the next one opened last, or the default path if none is left.
- **An archived roadmap opens read-only:** its graph or lanes, its summary if it was finished, and **Restore**. No Re-plan, no Next topic.
- **The Profile page's Engineering line** shows one line per active roadmap (goal and "5 of 14 learned"), most recently opened first.

## 2. Claude's tools

| Tool                | Change                                                                                                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get_current_state` | Lists every active roadmap: id, goal, counts and its Now topic, most recently opened first. Keeps `instructionsVersion`                                                             |
| `get_roadmap`       | Takes an optional `roadmapId`; without it, the roadmap opened last                                                                                                                  |
| `save_roadmap`      | Without `roadmapId`, adds a roadmap; refused at 3 active with "3 roadmaps are active. Ask the owner to archive one first". With `roadmapId`, re-plans that roadmap in place (below) |
| `report_progress`   | On Learned or Skipped, returns `roadmaps`: for each active roadmap with the topic, its goal, Next topic and finished chapter (or null)                                              |
| Topic tools         | Unchanged: `get_topic`, `get_history`, `get_my_work`, `save_exercise`, `save_note`                                                                                                  |

- **The instructions change** by one line: add a roadmap with `save_roadmap` unless the owner asks to re-plan one, then pass its `roadmapId`. `CLAUDE_INSTRUCTIONS_UPDATED` moves, so Claude setup shows Out of date until the owner pastes them again.
- Claude can't archive or restore. Those stay the owner's, like deleting notes.

## 3. Re-plan in place

Re-plan keeps the roadmap's id, so its address and place in the switcher stay. The version being replaced is copied to a new archived row first, so nothing is lost and it shows under Archived as "<goal> · replaced <date>".

## 4. Data

| Change              | How                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| Several active      | Drop the unique index `lab_roadmaps_one_active`. Code enforces the limit of 3                     |
| Last opened         | New nullable `last_opened_at` on `lab_roadmaps`; a roadmap never opened sorts by `created_at`     |
| Replaced versions   | New nullable `replaced_by` on `lab_roadmaps`: the id of the roadmap a replaced version belongs to |
| Archive and restore | Existing `status` and `archived_at`; restore clears `archived_at`                                 |

One migration. Dropping the index and adding nullable columns both work with the code already deployed: today's code archives before it inserts, so it never relies on the index.

## 5. Slices

| #   | Branch                              | Delivers                                                                                                                        |
| --- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `feat/engineering-roadmaps-data`    | §2, §3, §4: the migration, the limit, re-plan in place, archive and restore in the store, Claude's tools, the instructions line |
| 2   | `feat/engineering-roadmap-switcher` | §1: the switcher, addresses, last opened, New roadmap and Re-plan, the limit message                                            |
| 3   | `feat/engineering-roadmap-archive`  | §1: Archive and Restore, the read-only archived view, Archive on the summary, the Profile lines                                 |

Slice 1 ships first because Claude would otherwise keep replacing roadmaps. Until slice 2, the page shows the roadmap opened last (or the newest), so nothing breaks in between.

## 6. Done when

1. Planning a second roadmap with Claude keeps the first; both show in the switcher with their progress.
2. A fourth is refused, in the app and in Claude, until one is archived.
3. Re-plan replaces a roadmap without changing its address, and the old version shows under Archived.
4. Learning a topic on two roadmaps moves both, and Claude hears Next topic for each.
5. Archive and Restore work from the switcher; an archived roadmap opens read-only.
6. `/engineering` and the Profile line follow the roadmap opened last, on any device.
7. `pnpm test`, `pnpm check` and `pnpm build` pass, and steps 1 to 6 work on the hosted app.

## 7. Slice 1 as built

Built 14 Oct 2026 on `feat/engineering-roadmaps-data`.

- **Rules** in `features/engineering-lab/roadmaps.ts`: `ROADMAP_LIMIT` (3), `canAddRoadmap`, `orderRoadmaps` (last opened first, else newest) and `progressOnRoadmaps`, tested in `roadmaps.test.ts`.
- **Store** (`roadmap-store.ts`): `getRoadmap(userId, roadmapId?)` opens the named roadmap (active or archived, the owner's only), else the one opened last, else the role's path. `getRoadmaps` returns every active roadmap with one status query. `saveRoadmap(userId, plan, roadmapId?)` adds or re-plans; `archiveRoadmap`, `restoreRoadmap` and `markRoadmapOpened` are ready for slices 2 and 3. A new or re-planned roadmap counts as just opened, so it's the one that shows next. `RoadmapView` gains `id` and `active`.
- **Claude's tools:** `get_current_state` adds `roadmaps` (every active one, opened last first) and `roadmapId`; its other fields still describe the roadmap opened last. `get_roadmap` and `save_roadmap` take an optional `roadmapId`. `report_progress` on Learned or Skipped now returns `roadmaps` (one entry per active roadmap with the topic) in place of slice 2's single `next` and `chapterDone`.
- **Instructions:** one line on adding versus re-planning; `CLAUDE_INSTRUCTIONS_UPDATED` is now `2026-10-14`.
- **Migration** `0022_opposite_scrambler.sql`: drops `lab_roadmaps_one_active`, adds `last_opened_at` and `replaced_by`.
- **Until slice 2,** the page has no switcher: it shows the roadmap opened last, which is the newest one Claude saved. Older active roadmaps are kept and Claude can read them, but the page can't switch to them yet.

**Verified:** `pnpm test` (189, 3 new in `roadmaps.test.ts`), `pnpm check`, `pnpm build`, `test:db:engineering` (12 sections; the planning section now checks two roadmaps side by side, opening by id, per-owner ids, re-plan in place with its archived copy, the limit, archive and restore, and the order in `get_current_state`; the steps section checks `report_progress` on a topic that sits on two roadmaps) and `test:db:connector` (8). On the local server, the page loads with no errors and still shows the role's path when no roadmap is saved. Two stray test reports left on Call stack by slice 3's first script run were found and removed.

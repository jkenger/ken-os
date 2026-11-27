# Loona agent canvas

Handoff for the Loona agent mockup brief (proposed 26 Nov 2026): the Slice 3 chat outcome messages and the activity
log. Live canvas: https://claude.ai/artifact/VsSxXeJMMK3Nh22Lq8Mrne. To look at the frames outside the canvas, open
`../Loona agent.html`, a static snapshot with every state written out. The `.dc.html` files need the canvas runtime
(`support.js`), so read them as source.

- `canvas.json` lists every frame with its position and title, plus the behaviour notes.
- `Page.dc.html` is the shared page (sidebar, top bar, Chat / Activity tabs, chat, log). Every L frame imports it with
  props: `view`, `chat`, `log`, `theme`, `size`, `layout`.
- `Main.dc.html` is this README as a canvas frame.

Tokens are the console values in `apps/web/src/app/globals.css` on main. The chat shell is drawn from Slice 1 as it
stands on `feat/agents-loona-chat-shell` (Conversation, Message, MessageContent, Textarea, Button), unchanged.

## Frames

| Frame | State                                                                      | Status      |
| ----- | -------------------------------------------------------------------------- | ----------- |
| L1    | Chat: request sent, acknowledgement landed, run pending, no cue (baseline) | Done        |
| L2    | Same, with the pulsing dot; options (a), (b), (c) compared in "L2 options" | Done        |
| L3    | Resolved, success                                                          | Changed (1) |
| L4    | Resolved, duplicate phone                                                  | Changed (2) |
| L5    | Activity, empty                                                            | Done        |
| L6    | Activity, two Added and one Failed, newest first                           | Changed (3) |
| L7    | Added and Failed rows at 2x                                                | Done        |
| L8    | Tabs, both states (L8a, L8b); side panel alternative (L8c)                 | Changed (4) |
| L9    | Phone 390: L1 (L9a) and L6 (L9b)                                           | Done        |
| L10   | Dark: L3 (L10a) and L6 (L10b)                                              | Done        |

## Changes from this brief

1. **Success reply reads "Added Jane to your contacts."** instead of "Contact added". Loona's replies stay full
   sentences, and the activity log repeats the chat wording, where "Contact added" alone would not say who. One stored
   sentence then serves both.
2. **Failure reply: "Couldn't add Jane. 09171234567 is already saved on a contact."** Two short sentences instead of a
   dash: what failed and why, no em dash.
3. **The second Added row is a placeholder, [SECOND CONTACT].** Jane is the brief's only real example, and
   `docs/product/loona-agent.md` is not on main or any branch yet. Swap in a real one at review.
4. **No title row above the tabs.** Slice 1's chat page has none (the sidebar's Agents › Loona item names the page), so
   the Chat / Activity tabs sit at the top of the content column. Adding a title row would change the shell, which the
   brief keeps out of scope.
5. **Acknowledgement drawn with a full stop,** "Got it, adding now.", to match the full-sentence rule.

## Proposals

- **`--destructive-soft`** in `globals.css`, beside `--destructive`, mirroring `--topic-learned-soft`: light
  `oklch(0.955 0.03 25)`, dark `oklch(0.3 0.06 22)`. The Failed chip is `text-destructive` on it: 5.0:1 light, 5.3:1
  dark. `--diff-remove-soft` is nearly the same colour, but it means "replaced in a diff", so a role-named token reads
  better.
- **ActivityChip** (`success | failure`): StatusChip's exact shape (Badge `variant="secondary"`, `gap-1`, 12px icon)
  with its own words and icons: Added + CircleCheck on `bg-topic-learned-soft text-topic-learned` (4.9:1 light, 7.8:1
  dark); Failed + CircleX on `bg-destructive-soft text-destructive`.
- **Pending cue** on MessageContent: a 6px `muted-foreground` dot after the text, opacity 1 → 0.25 → 1 over 1.8s, with
  screen-reader text "Still working". No new token.
- **ActivityRow** grid: chip 76px, summary 1fr, time auto, in a divided panel (`gap-px bg-border`, as the Jobs scraper
  panel). At phone width, and in the L8c side panel, the summary drops to its own line under chip and time.

## Recommendations

- **Pending cue: (a), the pulsing dot.** The only option that reads as "still going" without making the message look
  wrong. (b) muted text looks disabled or failed and dims the line the owner needs; (c) a spinner shouts for a run that
  may take a while.
- **Resolved messages stay plain text,** no inline success icon. A green check in chat would need a red mark for
  failure to stay fair, and the brief keeps red out of the transcript. The resolved message is its own new bubble with
  no dot, which is the difference L3/L4 need from L2.
- **L8: tabs** (L8a, L8b). The log repeats what the chat already says, so a side panel (L8c) puts the same sentence on
  screen twice and squeezes the chat; it earns its place once a second agent exists. A separate route adds navigation
  for one list.

## Open questions

1. **Acknowledgement wording:** "Got it, adding now." (brief), "Adding Jane now." or "On it." Recommend "Adding Jane
   now.": shorter, and it names who is in flight.
2. **Duplicate-phone wording:** "Couldn't add Jane. 09171234567 is already saved on a contact." (drawn), or naming the
   existing contact when the write knows it. Recommend naming it, since the owner's next step is to look that contact
   up.
3. **Row limit:** recommend no pagination now. Load the newest 50, and when there are more, end the list with a muted
   line "Showing the latest 50". Revisit once real volume exists.
4. **L8 placement:** tabs, side panel or a separate route. Recommend tabs.
5. **Missing docs:** `docs/architecture/loona-agent.md` and `docs/product/loona-agent.md` are not on main or any branch,
   and Slice 1 is still on `feat/agents-loona-chat-shell`. The frames follow the brief's wording; check them against the
   docs once those land.

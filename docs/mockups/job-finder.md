# Jobs: mockup brief

Status: brief written 28 Oct 2026, no mockups yet. Spec: [job-finder.md](../product/job-finder.md).

## Frames to draw

Desktop at 1440 x 900 and phone at 390 wide for each.

1. **Setup:** no alerts received yet. The setup checklist: Copy address, Add Gmail filter, Set up alerts (LinkedIn,
   Indeed, OnlineJobs), each with a state (Done, Not started).
2. **New list:** about 12 postings with a mix of scores, sources, pay Not listed, Partial, and every shift label (Day,
   Mid, Night, Flexible, Not listed).
3. **One posting open:** the side panel with score, why it fits, what's missing, the quoted posting lines, the shift
   with its hours in Philippine time, and Open posting, Save, Mark applied, Dismiss.
4. **Filtered out:** rows showing the reason ("Below minimum pay", "On site", "Skip word: Sales") and Show anyway.
5. **Settings:** the preferences from the spec, Roles from the Profile, Alert keywords with Copy, the forwarding address.
6. **Strong match email** and **daily digest email**, as they look in Gmail.

## Rules

- Built from the parts Loots already has: rows, Badge, `DockedPanel`, the module column (max-w-5xl). Shared roles only,
  no new colours unless proposed below.
- Score and shift carry a word or number, never colour alone.
- App language: title "Jobs", tabs New, Saved, Applied, Filtered out; buttons Save, Mark applied, Dismiss, Show anyway,
  Copy address. No tagline, no sentence about what the page does. Read `docs/product/app-language.md` first.

## Content

Examples only, to replace: every company, title, pay and score. Roles come from the owner's real Profile headline and
last two titles.

## Open questions

None.

## Decided

- **Score** (28 Oct 2026): a number (92) in the row and the panel, no Strong, Good or Weak band.
- **Shift** (28 Oct 2026): its own column, with the label and the hours in Philippine time ("Mid shift, 5 PM to
  1 AM").

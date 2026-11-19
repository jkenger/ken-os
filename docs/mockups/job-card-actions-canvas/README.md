# Job listing card canvas

Source of the Job listing card mockups canvas: frames E1 to E11 from [job-card-actions.md](../job-card-actions.md) (the Job listing
card mockup brief, 18 Nov 2026). Live canvas: https://claude.ai/artifact/82KqsAPh8pHtSy74b35qG8

- `canvas.json` lists every frame (`boards`) with its position and title, in `order`, plus the behaviour notes.
- `Main.dc.html` is the hand-back README the brief asks for: frames table, changes from the brief, proposals, the E9
  reorganization recommendation and open questions.
- `Card.dc.html` is the shared card. Every frame file imports it with a `variant` prop; E7 and E8 put it behind
  their dialogs, and E10 imports it twice at 390 wide.
- The files need the canvas runtime (`support.js`) to render, so read them as source rather than opening them in a
  browser. To look at the frames outside the canvas, open `../Job listing card.html`, a static snapshot with every
  state written out.

Score and ATS are two same-size 40px progress rings (owner's decision, 19 Nov 2026) at the footer's far left, with
the rainbow gradient spanning each arc. The E9 recommendation, in short: keep the card, split its footer by role
(rings and the AI actions left, pay and Apply right), and move pay into the footer beside Apply.

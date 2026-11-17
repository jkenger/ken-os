# Cover letter canvas

Source of the Cover letter mockups canvas: frames C1 to C3 (the Job detail title row) and D1 to D9 (the Cover
letter tab) from [cover-letter.md](../cover-letter.md), with the owner's 17 Nov 2026 review folded in. Live
canvas: https://claude.ai/artifact/LpmDPnv1cziB8odRYofNsh

- `canvas.json` lists every frame (`boards`) with its position and title, in `order`, plus the behaviour notes.
- `Main.dc.html` is the hand-back README the brief asks for: frames table, changes from the brief, proposals and
  decisions.
- `TitleRow.dc.html` is the shared title row (C1 to C3); `LetterPage.dc.html` is the shared Job detail page with
  the Cover letter tab (D1 to D9). Every frame file imports one of them with a `variant` prop.
- The files need the canvas runtime (`support.js`) to render, so read them as source rather than opening them in a
  browser. To look at the frames outside the canvas, open `../Cover letter.html`, a static snapshot with every
  state written out.

Owner decisions, 17 Nov 2026: the letter is a third Job detail tab, not a separate page; the empty and error
states span the tab; the phone title row wraps; the edited status reads "Edited"; Copy letter sits before
Regenerate and Save; Job detail always opens on Description; unsaved edits survive switching tabs.

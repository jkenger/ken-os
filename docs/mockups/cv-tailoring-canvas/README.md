# CV tailoring canvas

Source of the CV tailoring mockups canvas: the Job detail title row's CV button states from the CV tailoring
mockup brief (17 Nov 2026), frames A1 to A7. Live canvas: https://claude.ai/artifact/SoWKeukikWanKMbWrWVhUa

- `canvas.json` lists every frame (`boards`) with its position and title, in `order`, plus the behaviour notes.
- `Main.dc.html` is the hand-back README the brief asks for: frames table, changes from the brief, proposals and open
  questions.
- `Row.dc.html` is the shared title row. Every frame file (`A1.dc.html` to `A6.dc.html`) imports it with a `variant`
  prop; `A7.dc.html` imports it twice at 390 wide (phone variants `P1` and `P3`).
- The files need the canvas runtime (`support.js`) to render, so read them as source rather than opening them in a
  browser. Tokens are the Loots console values from `apps/web/DESIGN.md`, light, with A6 in dark.

Owner decisions folded into the frames on 17 Nov 2026:

- The CV button has a gradient border in three states: idle at 45% (A1, A5), rotating while it works (A2, A4), full
  and still once a tailored CV exists (A3, A6). The icons inside it use the same gradient. This is a proposal: it is
  not one of the Loots state colours, so it needs a decision log entry and a token or Button variant before code.
- View tailored CV and Regenerate are one split button, and Regenerate only exists once a tailored CV does.
- First run and regenerate share one pending state: A4 shows the same button as A2.
- View tailored CV and Apply use the job list's up-right arrow with its 2px hover nudge.

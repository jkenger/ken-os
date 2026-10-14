Someone rewrote the support prompt. It reads better, but did the answers get better? An eval runs both versions over
the same labeled cases and compares. The starter crashes when one case errors, reports only one overall number, and
lets a change through when a whole category of questions got worse.

- `await runEval(cases, generate, grade)`: `cases` are `{ id, input, expected, tags }`. Return one
  `{ id, tags, pass, output }` per case, where `pass` is `grade(output, expected)`. A `generate` that throws is a failed
  case with `error` set, not a crash.
- `report(results)`: `{ total, passed, passRate, byTag }`, where `byTag[tag]` is `{ total, passed, passRate }`.
- `gate(baseline, candidate, { maxDrop })` compares two result lists. Return `{ ok, passRateChange, regressions,
tagDrops }`:
  - `regressions`: ids that passed before and fail now.
  - `tagDrops`: tags whose pass rate fell by more than `maxDrop`.
  - `ok` only when the overall rate fell by no more than `maxDrop` and no tag did.

```js
// cases, oldPrompt and grade come from the tests
const results = await runEval(cases, oldPrompt, grade);
results[0];
// → { id: "r1", tags: ["returns"], pass: true, output: "Yes, within 30 days." }
report(results).byTag.shipping;
// → { total: 3, passed: 2, passRate: 0.6666666666666666 }
```

Then explain where the cases come from, when to grade with code versus a model, and why a small eval set run often
beats a big one run rarely.

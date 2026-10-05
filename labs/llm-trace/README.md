An agent run is recorded as spans: one for the whole run, one per model call, one per tool call. Each span is
`{ id, parentId, kind, name, start, end }` (times in milliseconds). Model spans (`kind: "llm"`) also have `model`,
`inputTokens` and `outputTokens`; a failed span has `error`.

`summarizeRun(spans, prices)` answers "what did this run cost, and where did the time go?". `prices[model]` is
`{ input, output }` in US dollars per million tokens. Return:

- `durationMs`: wall-clock time, from the earliest start to the latest end. Tools that ran in parallel overlap, so
  adding their durations is wrong.
- `tokens`: `{ input, output }` across model calls.
- `costUsd`: total cost, rounded to 6 decimal places.
- `byModel[model]`: `{ calls, inputTokens, outputTokens, costUsd }`.
- `slowest`: `{ name, durationMs }` of the slowest span that isn't the run itself.
- `failedTools`: names of tool spans with an `error`.
- `unpriced`: models with no price. Count their tokens but not a cost, so one missing price doesn't turn the total
  into `NaN`.

Then explain what to record on a model span, what not to record (personal data in prompts), and how sampling helps.

The starter sends every question to the large model. It's slow and expensive, and most questions don't need it.

`createAnswerer({ small, large, costOf, dailyBudgetUsd })` returns `{ answer, spent }`:

- `small(question)` and `large(question)` return `{ text, confident }` (`large` is always confident).
- `costOf(modelName, reply)` returns what that reply cost in US dollars.
- `await answer(question)` returns `{ text, model, costUsd }`:
  1. Repeated questions come from a cache, with `model: "cache"` and `costUsd: 0`. Treat `"  What are your HOURS? "`
     and `"what are your hours?"` as the same question.
  2. Otherwise ask `small`. If it's confident, use it.
  3. If not, ask `large`, unless today's spend has reached `dailyBudgetUsd`. Then return the small answer with
     `degraded: true`.
  4. Cache only confident answers; `costUsd` is everything spent on this question.
- `spent()` returns the total spent so far.

```js
// setup comes from the tests: small is unsure about refunds, small costs 0.01 and large 0.4
const { answerer } = setup();
await answerer.answer("What are your hours?");
// → { text: "Small: What are your hours?", model: "small", costUsd: 0.01 }
await answerer.answer("  what are your HOURS? ");
// → { text: "Small: What are your hours?", model: "cache", costUsd: 0 }
```

Then explain the other levers on cost and latency: shorter prompts, prompt caching, streaming, and batching.

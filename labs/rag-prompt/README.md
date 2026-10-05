Retrieval found chunks for a question; now build the prompt the model will answer from. The starter pastes every
chunk in, ignores the model's limit, and asks for an answer without saying where it must come from.

`buildPrompt(question, chunks, { maxTokens, countTokens })` takes chunks ranked best first, each `{ id, text }`, and
returns `{ prompt, used }`:

- Add chunks in rank order while the whole prompt stays within `maxTokens` (measure with `countTokens(text)`). Skip a
  chunk that would overflow and try the next, smaller one.
- Skip a chunk whose text is the same as one already added.
- Label each chunk in the prompt as `[id] text`, one per line, so the answer can cite it.
- Tell the model to answer only from these sources, to cite them as `[id]`, and to reply `I don't know` when the
  sources don't contain the answer.
- Put the question last. `used` lists the ids of the chunks included, in order.

Also write `checkCitations(answer, used)`, returning `{ cited, unknown }`: the ids cited as `[id]` in the answer, and
any that weren't among the sources. Then explain why grounding instructions reduce made-up answers but can't prevent
them, and what you'd show users as sources.

A long chat outgrows the context window. The starter drops the oldest messages when it's over budget, so the
assistant forgets the user's name and everything said early on.

`createMemory({ maxTokens, keepRecent, countTokens, summarize })` returns `{ add, remember, context }`:

- `await add(message)` stores a `{ role, content }` message. When the stored messages add up to more than `maxTokens`,
  fold every message except the newest `keepRecent` into a running summary with
  `await summarize(previousSummary, olderMessages)`. `previousSummary` is `""` the first time.
- `remember(fact)` pins a fact that must never be summarized away (ignore duplicates).
- `context()` returns the messages to send: a `system` message listing pinned facts (when there are any), then a
  `system` message starting `Summary of earlier conversation:` (when there is a summary), then the recent messages
  word for word.

Then explain short-term memory (the conversation), long-term memory (facts kept across sessions) and what each costs.

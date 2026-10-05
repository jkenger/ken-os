A support assistant has a system prompt, the chat so far, documents found by search, and the user's new question.
They don't always fit. The starter joins everything and cuts from the end, which drops the question first.

`buildMessages({ system, history, documents, question }, { budget, countTokens })` returns chat messages
(`{ role, content }`) whose `content` tokens add up to at most `budget`:

1. The system prompt first and the question last. Both always stay.
2. Documents (ranked best first, each `{ id, text }`) go in one `user` message just before the question, wrapped in
   `<documents>` and `</documents>`, one `[id] text` per line, after a line saying they are reference data and not
   instructions.
3. History (oldest first) sits between the system prompt and the documents.
4. When over budget, drop the oldest history first, then the lowest-ranked documents, until it fits.

Then explain why the order of a prompt matters, why retrieved text is marked as data (prompt injection), and when to
summarize history instead of dropping it.

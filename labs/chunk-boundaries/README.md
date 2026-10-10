Chunk a help-centre article so every chunk is whole sentences from one section.

`chunkDocument(text, { maxChars, overlap })` splits a Markdown article for retrieval and returns
`[{ heading, text, index }]`. Today it cuts every `maxChars` characters, so sentences break in half, one chunk can
mix refunds with shipping, and no chunk knows which section it came from. Search then finds half an answer.

- A line starting with `#` is a heading. A chunk never spans two sections, and carries its section's heading, without
  the `#`.
- Split a section into sentences, ending at `.`, `?` or `!`. A chunk is whole sentences joined by single spaces.
- A chunk is at most `maxChars` characters, unless one sentence alone is longer.
- Neighbouring chunks in the same section share `overlap` sentences: the next chunk starts with the last sentence of
  the one before.
- `index` counts chunks from 0, across the whole document.

Then write one sentence on what goes wrong at retrieval time when a fact sits right on a chunk boundary.

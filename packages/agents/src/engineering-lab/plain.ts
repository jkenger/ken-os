// The plain-language rule for everything the Engineering agents write for the owner to read: questions, rubric lines,
// feedback and lessons. Owner rule, 10 Oct 2026; see docs/product/app-language.md, "Question wording".

export const PLAIN_LANGUAGE = `Plain language, always:
- Write so a smart person outside this exact field understands on first read, without looking anything up.
- Prefer everyday words: "check" not "enforce", "rule that must always hold" not "invariant", "sends again" not "retries idempotently", "split into pieces" not "chunked".
- Use a technical term only when it is the thing being taught or tested, and then say what it means in a few plain words the first time.
- Code names (functions, keywords, APIs) stay exact; the sentences around them stay plain.
- Short sentences, concrete situations, no jargon, no em dashes.`;

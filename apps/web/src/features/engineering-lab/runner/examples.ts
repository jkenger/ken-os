// The worked examples in a task: code blocks after the first paragraph, where `// → result` follows a call.

const BLOCKS = /```[\w-]*\n([\s\S]*?)```/g;
const ARROW = /^(.*?)\s*\/\/ → (.*)$/;

function detailBlocks(readme: string) {
  const details = readme
    .trim()
    .split(/\n\s*\n/)
    .slice(1)
    .join("\n\n");
  return [...details.matchAll(BLOCKS)].map(([, block]) => block.split("\n"));
}

const bracketDepth = (text: string) => (text.match(/[[{(]/g) ?? []).length - (text.match(/[\]})]/g) ?? []).length;

/**
 * Each example as Try it input that returns the value shown after its arrow, with that expected value.
 * A result continues on further `//` lines while its brackets are open.
 */
export function workedExamples(readme: string) {
  const found: { input: string; expected: string }[] = [];
  for (const lines of detailBlocks(readme)) {
    const code: string[] = [];
    for (let at = 0; at < lines.length; at += 1) {
      const arrow = ARROW.exec(lines[at]);
      if (!arrow) {
        code.push(lines[at]);
        continue;
      }
      let expected = arrow[2];
      while (bracketDepth(expected) > 0 && /^\s*\/\//.test(lines[at + 1] ?? ""))
        expected += lines[++at].replace(/^\s*\/\/\s?/, "");
      if (arrow[1].trim()) code.push(arrow[1]);
      // The value is the last statement: from the last line that starts at the left edge.
      let start = code.length - 1;
      while (start > 0 && (/^[\s)\]}]/.test(code[start]) || !code[start].trim())) start -= 1;
      const value = code.slice(start).join("\n").trim().replace(/;$/, "");
      found.push({ input: `${code.slice(0, start).join("\n")}\nreturn (${value});`.trimStart(), expected });
    }
  }
  return found;
}

/** The code of the first example up to its first result, without comment lines: what Try it starts with. */
export function firstExample(readme: string): string | null {
  for (const lines of detailBlocks(readme)) {
    const end = lines.findIndex((line) => ARROW.test(line));
    if (end < 0) continue;
    const code = [...lines.slice(0, end), ARROW.exec(lines[end])![1]]
      .filter((line) => line.trim() && !/^\s*\/\//.test(line))
      .join("\n");
    if (code) return code;
  }
  return null;
}

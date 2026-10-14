// Expected against got, line by line, for a failed test. Pure so it can be tested in Node.

export interface DiffLine {
  kind: "same" | "expected" | "got";
  text: string;
  /** For a line paired with one on the other side: the start and end of the part that differs. */
  changed?: [number, number];
}

/** Past this many lines a side, the diff skips matching and lists both sides whole. */
const MAX_LINES = 400;

function narrow(a: string, b: string): [[number, number], [number, number]] {
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start += 1;
  let end = 0;
  while (end < a.length - start && end < b.length - start && a[a.length - 1 - end] === b[b.length - 1 - end]) end += 1;
  return [
    [start, a.length - end],
    [start, b.length - end],
  ];
}

/** Runs of removed then added lines, with each removed line paired to the added line in the same position. */
function pairUp(lines: DiffLine[]): DiffLine[] {
  const out: DiffLine[] = [];
  let index = 0;
  while (index < lines.length) {
    if (lines[index].kind === "same") {
      out.push(lines[index]);
      index += 1;
      continue;
    }
    const expected: DiffLine[] = [];
    const got: DiffLine[] = [];
    while (index < lines.length && lines[index].kind !== "same") {
      (lines[index].kind === "expected" ? expected : got).push(lines[index]);
      index += 1;
    }
    const pairs = Math.min(expected.length, got.length);
    const ranges = Array.from({ length: pairs }, (_, at) => narrow(expected[at].text, got[at].text));
    out.push(
      ...expected.map((line, at) => (at < pairs ? { ...line, changed: ranges[at][0] } : line)),
      ...got.map((line, at) => (at < pairs ? { ...line, changed: ranges[at][1] } : line)),
    );
  }
  return out;
}

export function lineDiff(expected: string, actual: string): DiffLine[] {
  const a = expected.split("\n");
  const b = actual.split("\n");
  if (a.length > MAX_LINES || b.length > MAX_LINES)
    return [
      ...a.map((text): DiffLine => ({ kind: "expected", text })),
      ...b.map((text): DiffLine => ({ kind: "got", text })),
    ];
  // Longest common subsequence of lines, filled from the end so the walk below goes forward.
  const table = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1)
    for (let j = b.length - 1; j >= 0; j -= 1)
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
  const lines: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      lines.push({ kind: "same", text: a[i] });
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) lines.push({ kind: "expected", text: a[i++] });
    else lines.push({ kind: "got", text: b[j++] });
  }
  while (i < a.length) lines.push({ kind: "expected", text: a[i++] });
  while (j < b.length) lines.push({ kind: "got", text: b[j++] });
  return pairUp(lines);
}

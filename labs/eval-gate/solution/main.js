// An eval is a test suite for behavior that isn't exact: labeled cases, a grader, and a comparison against the last
// accepted version. Cases come from real traffic and past failures, tagged by what they cover. Grade with code when
// the answer can be checked (a value, a format, a citation) and with a model only for qualities code can't judge,
// checking that grader against human labels. One overall number hides a broken category, so compare per tag and list
// the exact cases that regressed. A small set that runs on every prompt change catches more than a big one run rarely.
async function runEval(cases, generate, grade) {
  const results = [];
  for (const item of cases) {
    try {
      const output = await generate(item.input);
      results.push({ id: item.id, tags: item.tags, pass: Boolean(grade(output, item.expected)), output });
    } catch (error) {
      results.push({ id: item.id, tags: item.tags, pass: false, output: null, error: error.message });
    }
  }
  return results;
}

function rate(group) {
  const passed = group.filter((result) => result.pass).length;
  return { total: group.length, passed, passRate: group.length ? passed / group.length : 0 };
}

function report(results) {
  const byTag = {};
  const tags = [...new Set(results.flatMap((result) => result.tags))];
  for (const tag of tags) byTag[tag] = rate(results.filter((result) => result.tags.includes(tag)));
  return { ...rate(results), byTag };
}

const EPSILON = 1e-9;

function gate(baseline, candidate, { maxDrop }) {
  const before = report(baseline);
  const after = report(candidate);
  const passRateChange = after.passRate - before.passRate;
  const passedBefore = new Set(baseline.filter((result) => result.pass).map((result) => result.id));
  const regressions = candidate.filter((result) => !result.pass && passedBefore.has(result.id)).map((result) => result.id);
  const tagDrops = Object.keys(before.byTag).filter((tag) => {
    const now = after.byTag[tag] ? after.byTag[tag].passRate : 0;
    return before.byTag[tag].passRate - now > maxDrop + EPSILON;
  });
  const ok = -passRateChange <= maxDrop + EPSILON && tagDrops.length === 0;
  return { ok, passRateChange, regressions, tagDrops };
}

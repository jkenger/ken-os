async function runEval(cases, generate, grade) {
  const results = [];
  for (const item of cases) {
    const output = await generate(item.input);
    results.push({ id: item.id, tags: item.tags, pass: grade(output, item.expected), output });
  }
  return results;
}

function report(results) {
  const passed = results.filter((result) => result.pass).length;
  return { total: results.length, passed, passRate: passed / results.length, byTag: {} };
}

function gate(baseline, candidate, { maxDrop }) {
  const passRateChange = report(candidate).passRate - report(baseline).passRate;
  return { ok: passRateChange >= -maxDrop, passRateChange, regressions: [], tagDrops: [] };
}

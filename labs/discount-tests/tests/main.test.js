function normalize(code) {
  return typeof code === "string" ? code.trim().toUpperCase() : "";
}

// The real function.
function real(subtotal, code) {
  const key = normalize(code);
  if (key === "SAVE10" && subtotal >= 5000) return subtotal - Math.floor(subtotal / 10);
  if (key === "FLAT500") return Math.max(0, subtotal - 500);
  return subtotal;
}

// Five broken copies, one realistic bug each.
const mutants = {
  "SAVE10 only above 5000, not at 5000": (subtotal, code) => {
    const key = normalize(code);
    if (key === "SAVE10" && subtotal > 5000) return subtotal - Math.floor(subtotal / 10);
    if (key === "FLAT500") return Math.max(0, subtotal - 500);
    return subtotal;
  },
  "FLAT500 can go below zero": (subtotal, code) => {
    const key = normalize(code);
    if (key === "SAVE10" && subtotal >= 5000) return subtotal - Math.floor(subtotal / 10);
    if (key === "FLAT500") return subtotal - 500;
    return subtotal;
  },
  "codes are case sensitive and untrimmed": (subtotal, code) => {
    if (code === "SAVE10" && subtotal >= 5000) return subtotal - Math.floor(subtotal / 10);
    if (code === "FLAT500") return Math.max(0, subtotal - 500);
    return subtotal;
  },
  "10% is rounded to the nearest cent, not down": (subtotal, code) => {
    const key = normalize(code);
    if (key === "SAVE10" && subtotal >= 5000) return subtotal - Math.round(subtotal / 10);
    if (key === "FLAT500") return Math.max(0, subtotal - 500);
    return subtotal;
  },
  "an unknown code takes 10% off anyway": (subtotal, code) => {
    const key = normalize(code);
    if (key === "FLAT500") return Math.max(0, subtotal - 500);
    if (key && subtotal >= 5000) return subtotal - Math.floor(subtotal / 10);
    return subtotal;
  },
};

const cases = () => {
  const list = discountCases();
  assert.ok(Array.isArray(list) && list.length > 0, "discountCases() must return a list of cases");
  return list;
};

test("every case passes against the real function", () => {
  for (const item of cases()) {
    assert.equal(real(item.subtotal, item.code), item.expected,
      `Your case { subtotal: ${item.subtotal}, code: ${JSON.stringify(item.code)} } expects ${item.expected}, but the rules give ${real(item.subtotal, item.code)}.`);
  }
});

for (const [bug, broken] of Object.entries(mutants)) {
  test(`catches the bug: ${bug}`, () => {
    const caught = cases().some((item) => broken(item.subtotal, item.code) !== item.expected);
    assert.ok(caught, `None of your cases fails when ${bug}.`);
  });
}

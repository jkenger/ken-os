// A test earns its place by failing when the code is wrong. Happy-path cases pass for most bugs, because bugs live
// at edges: exactly at a threshold, just past a floor, in rounding, in input that isn't shaped the way the happy path
// assumes, and in what happens with input nobody planned for. So pick cases at each rule's boundary and on each side
// of it. These are unit tests: a pure function, no I/O, so they run in milliseconds and can cover every edge. Keep
// an end-to-end test for the path a customer takes (apply a code at checkout and see the total), not for every edge.
function discountCases() {
  return [
    // SAVE10 at and around its threshold.
    { subtotal: 4999, code: "SAVE10", expected: 4999 },
    { subtotal: 5000, code: "SAVE10", expected: 4500 },
    { subtotal: 10000, code: "SAVE10", expected: 9000 },
    // Rounding: 10% of 5009 is 500.9 cents; rounded down that's 500 off, not 501.
    { subtotal: 5009, code: "SAVE10", expected: 4509 },
    // FLAT500 near and below its floor.
    { subtotal: 2000, code: "FLAT500", expected: 1500 },
    { subtotal: 500, code: "FLAT500", expected: 0 },
    { subtotal: 300, code: "FLAT500", expected: 0 },
    // Case and spaces.
    { subtotal: 6000, code: " save10 ", expected: 5400 },
    { subtotal: 900, code: "flat500", expected: 400 },
    // Unknown and missing codes change nothing, even above the SAVE10 threshold.
    { subtotal: 8000, code: "BOGUS", expected: 8000 },
    { subtotal: 8000, code: "", expected: 8000 },
    { subtotal: 8000, code: undefined, expected: 8000 },
  ];
}

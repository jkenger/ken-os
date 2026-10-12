This time you write the tests. `priceAfterDiscount(subtotal, code)` is already written and correct. Its rules, with
all amounts in cents:

- `SAVE10` takes 10% off, rounded down to the cent, but only when the subtotal is at least 5000.
- `FLAT500` takes 500 off, but never below 0.
- Codes ignore case and surrounding spaces, so `save10` works.
- Any other code, or no code, leaves the price unchanged.

Fill in `discountCases()` with cases, each `{ subtotal, code, expected }`. The lab runs your cases against the real
function, where every case must pass, and against five broken copies, each with one realistic bug. A copy counts as
caught when at least one of your cases fails on it. Catch all five.

Don't read the broken copies first. Look at the rules and ask where a bug would hide: the edges of each rule, and the
inputs a hurried developer forgets. Then explain why one happy-path test per rule wasn't enough, and which of these
cases you'd still want as an end-to-end test.

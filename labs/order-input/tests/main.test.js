const valid = { email: "  Ken@Example.com ", sku: "ABC-1234", quantity: 3, note: "Gift wrap" };
const paths = (result) => (result.errors ?? []).map((error) => error.path).sort();

test("a valid order parses into exactly the four fields", () => {
  const result = parseOrder(valid);
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, { email: "ken@example.com", sku: "ABC-1234", quantity: 3, note: "Gift wrap" });
});

test("fields the order doesn't define never pass through", () => {
  const result = parseOrder({ ...valid, price: 0, isAdmin: true, userId: 1 });
  assert.equal(result.ok, true);
  assert.deepEqual(
    Object.keys(result.value).sort(),
    ["email", "note", "quantity", "sku"],
    "price, isAdmin and userId must be dropped",
  );
});

test("a missing note becomes null", () => {
  const { note, ...rest } = valid;
  const result = parseOrder(rest);
  assert.equal(result.ok, true);
  assert.equal(result.value.note, null);
});

test("quantity must already be a whole number from 1 to 100", () => {
  for (const quantity of ["3", 2.5, 0, 101, null, true]) {
    const result = parseOrder({ ...valid, quantity });
    assert.equal(result.ok, false, `quantity ${JSON.stringify(quantity)} should be rejected`);
    assert.deepEqual(paths(result), ["quantity"]);
  }
});

test("every problem is reported at once, each with its field", () => {
  const result = parseOrder({ email: "not-an-email", sku: "abc1234", quantity: "lots", note: "x".repeat(201) });
  assert.equal(result.ok, false);
  assert.deepEqual(paths(result), ["email", "note", "quantity", "sku"]);
  assert.ok(result.errors.every((error) => typeof error.message === "string" && error.message.length > 0));
});

test("a body that isn't an object is rejected, not crashed on", () => {
  for (const body of [null, [], "order", 42, undefined]) {
    const result = parseOrder(body);
    assert.equal(result.ok, false, `${JSON.stringify(body)} should be rejected`);
    assert.deepEqual(paths(result), ["body"]);
  }
});

test("a non-string email or sku is an error, not a crash", () => {
  const result = parseOrder({ ...valid, email: { address: "a@b.c" }, sku: 1234 });
  assert.equal(result.ok, false);
  assert.deepEqual(paths(result), ["email", "sku"]);
});

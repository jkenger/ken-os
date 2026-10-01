async function paymentsFor(key) {
  return (await db.query("select count(*)::int as n from payments where idempotency_key = $1", [key])).rows[0].n;
}

test("migrate runs", async () => {
  await migrate(db);
});

test("five simultaneous retries create one payment", async () => {
  const results = await Promise.all(Array.from({ length: 5 }, () => createPayment(db, { idempotencyKey: "pay-1", amount: 2500 })));
  assert.equal(await paymentsFor("pay-1"), 1);
  assert.equal(new Set(results.map((payment) => payment.id)).size, 1, "every retry must return the same payment");
});

test("a later retry returns the original payment", async () => {
  const first = (await db.query("select id from payments where idempotency_key = 'pay-1'")).rows[0];
  const again = await createPayment(db, { idempotencyKey: "pay-1", amount: 2500 });
  assert.equal(again.id, first.id);
});

test("a different key is a different payment", async () => {
  await createPayment(db, { idempotencyKey: "pay-2", amount: 900 });
  assert.equal(await paymentsFor("pay-2"), 1);
});

test("reusing a key with a different amount rejects", async () => {
  await assert.rejects(() => createPayment(db, { idempotencyKey: "pay-1", amount: 9999 }));
  assert.equal(await paymentsFor("pay-1"), 1);
});

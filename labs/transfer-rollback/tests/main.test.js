async function balances() {
  const { rows } = await db.query("select id, balance from accounts order by id");
  return Object.fromEntries(rows.map((row) => [row.id, row.balance]));
}

async function transferCount() {
  return (await db.query("select count(*)::int as n from transfers")).rows[0].n;
}

test("a normal transfer moves the money and records it", async () => {
  const before = await balances();
  await transfer(db, 1, 2, 30);
  const after = await balances();
  assert.equal(after[1], before[1] - 30);
  assert.equal(after[2], before[2] + 30);
  assert.equal(await transferCount(), 1);
});

test("a transfer to a frozen account changes nothing", async () => {
  const before = await balances();
  const count = await transferCount();
  await assert.rejects(() => transfer(db, 1, 3, 20), "the transfer should reject");
  assert.deepEqual(await balances(), before);
  assert.equal(await transferCount(), count);
});

test("an overdraft changes nothing", async () => {
  const before = await balances();
  await assert.rejects(() => transfer(db, 2, 1, 1000), "the transfer should reject");
  assert.deepEqual(await balances(), before);
});

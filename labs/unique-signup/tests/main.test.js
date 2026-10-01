async function memberCount() {
  return (await db.query("select count(*)::int as n from members")).rows[0].n;
}

test("migrate runs", async () => {
  await migrate(db);
});

test("four simultaneous sign-ups with one email create one account", async () => {
  const results = await Promise.all(Array.from({ length: 4 }, () => signUp(db, "ana@example.com")));
  assert.equal(results.filter((result) => result.ok).length, 1);
  assert.equal(await memberCount(), 1);
  assert.ok(results.filter((result) => !result.ok).every((result) => result.reason === "taken"));
});

test("capitals don't make a second account", async () => {
  const result = await signUp(db, "Ana@Example.com");
  assert.deepEqual(result, { ok: false, reason: "taken" });
  assert.equal(await memberCount(), 1);
});

test("a different email still works", async () => {
  const result = await signUp(db, "ben@example.com");
  assert.equal(result.ok, true);
  assert.equal(await memberCount(), 2);
});

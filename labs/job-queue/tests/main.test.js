const job = async (id) => (await db.query("select * from jobs where id = $1", [id])).rows[0];
const reset = () => db.query("delete from jobs");

test("five workers asking at once share three jobs without overlap", async () => {
  await reset();
  for (const n of [1, 2, 3]) await enqueue(db, "email", { n });
  const claims = await Promise.all(["w1", "w2", "w3", "w4", "w5"].map((worker) => claimNext(db, worker)));
  const got = claims.filter(Boolean);
  assert.equal(got.length, 3, "three workers get a job and two get null");
  assert.equal(new Set(got.map((item) => item.id)).size, 3, "no job is handed to two workers");
  assert.ok(got.every((item) => item.status === "running" && item.attempts === 1));
});

test("a job that isn't due yet waits", async () => {
  await reset();
  const later = await enqueue(db, "email", {});
  await db.query("update jobs set run_after = now() + interval '1 hour' where id = $1", [later.id]);
  assert.equal(await claimNext(db, "w1"), null);
});

test("a failure backs off, and the third failure is dead", async () => {
  await reset();
  const created = await enqueue(db, "resize", {});
  await claimNext(db, "w1");
  await fail(db, created.id, "w1", "timeout");
  const once = await job(created.id);
  assert.equal(once.status, "pending");
  assert.equal(once.last_error, "timeout");
  const { rows } = await db.query("select run_after > now() + interval '1 second' as later from jobs where id = $1", [
    created.id,
  ]);
  assert.ok(rows[0].later, "a failed job waits before running again");
  for (const n of [2, 3]) {
    await db.query("update jobs set run_after = now() where id = $1", [created.id]);
    await claimNext(db, "w1");
    await fail(db, created.id, "w1", `timeout ${n}`);
  }
  const dead = await job(created.id);
  assert.equal(dead.attempts, 3);
  assert.equal(dead.status, "dead");
});

test("a job held by a worker that died can be claimed again", async () => {
  await reset();
  const created = await enqueue(db, "email", {});
  await claimNext(db, "w1");
  assert.equal(await claimNext(db, "w2"), null, "while w1's lease is fresh, nobody else takes it");
  await db.query("update jobs set locked_at = now() - interval '1 minute' where id = $1", [created.id]);
  const taken = await claimNext(db, "w2");
  assert.equal(taken?.id, created.id);
  assert.equal(taken.locked_by, "w2");
});

test("only the worker holding a job can complete it", async () => {
  const [held] = (await db.query("select * from jobs where locked_by = 'w2'")).rows;
  assert.equal(await complete(db, held.id, "w1"), false, "w1 lost the job when its lease ran out");
  assert.equal((await job(held.id)).status, "running");
  assert.equal(await complete(db, held.id, "w2"), true);
  assert.equal((await job(held.id)).status, "done");
});

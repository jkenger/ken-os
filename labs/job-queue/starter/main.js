async function enqueue(db, type, payload) {
  const { rows } = await db.query("insert into jobs (type, payload) values ($1, $2) returning *", [type, payload]);
  return rows[0];
}

async function claimNext(db, workerId) {
  const { rows } = await db.query("select * from jobs where status = 'pending' order by id limit 1");
  if (!rows.length) return null;
  const { rows: claimed } = await db.query(
    "update jobs set status = 'running', locked_by = $2, locked_at = now(), attempts = attempts + 1 where id = $1 returning *",
    [rows[0].id, workerId],
  );
  return claimed[0];
}

async function complete(db, jobId, workerId) {
  await db.query("update jobs set status = 'done' where id = $1", [jobId]);
  return true;
}

async function fail(db, jobId, workerId, message) {
  await db.query("update jobs set status = 'pending', last_error = $2 where id = $1", [jobId, message]);
}

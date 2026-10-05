// Claiming must be one atomic step. Reading the next job and then updating it lets several workers read the same row
// first. One UPDATE whose inner SELECT locks the row with FOR UPDATE SKIP LOCKED gives each worker a different job
// and skips rows another worker is taking. A lease (locked_at) lets a job held by a crashed worker be claimed again;
// the cost is that a slow worker past its lease can overlap with the next one, so jobs must be safe to run twice and
// only the current holder may complete one. Failures back off exponentially and stop at a dead state.
async function enqueue(db, type, payload) {
  const { rows } = await db.query("insert into jobs (type, payload) values ($1, $2) returning *", [type, payload]);
  return rows[0];
}

async function claimNext(db, workerId) {
  const { rows } = await db.query(
    `update jobs set status = 'running', locked_by = $1, locked_at = now(), attempts = attempts + 1
     where id = (
       select id from jobs
       where (status = 'pending' and run_after <= now())
          or (status = 'running' and locked_at < now() - interval '30 seconds')
       order by id
       limit 1
       for update skip locked
     )
     returning *`,
    [workerId],
  );
  return rows[0] ?? null;
}

async function complete(db, jobId, workerId) {
  const { rows } = await db.query(
    "update jobs set status = 'done' where id = $1 and locked_by = $2 and status = 'running' returning id",
    [jobId, workerId],
  );
  return rows.length > 0;
}

async function fail(db, jobId, workerId, message) {
  await db.query(
    `update jobs set
       status = case when attempts >= 3 then 'dead' else 'pending' end,
       run_after = now() + (power(2, attempts) || ' seconds')::interval,
       last_error = $3,
       locked_by = null,
       locked_at = null
     where id = $1 and locked_by = $2`,
    [jobId, workerId, message],
  );
}

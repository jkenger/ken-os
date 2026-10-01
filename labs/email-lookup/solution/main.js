// Without an index, Postgres can only find matching rows by reading all of them (Seq Scan). A B-tree index on
// email keeps the emails sorted with pointers to their rows, so one lookup walks a few pages instead of 30,000 rows.
async function migrate(db) {
  await db.exec("create index customers_email_idx on customers (email)");
}

async function findCustomer(db, email) {
  const { rows } = await db.query("select * from customers where email = $1", [email]);
  return rows[0] ?? null;
}

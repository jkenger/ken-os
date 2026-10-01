async function migrate(db) {
  // Schema changes go here.
}

async function findCustomer(db, email) {
  const { rows } = await db.query("select * from customers where email = $1", [email]);
  return rows[0] ?? null;
}

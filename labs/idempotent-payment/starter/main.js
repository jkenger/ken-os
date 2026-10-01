async function migrate(db) {
  // Schema changes go here.
}

async function createPayment(db, { idempotencyKey, amount }) {
  const { rows } = await db.query(
    "insert into payments (idempotency_key, amount) values ($1, $2) returning id, amount",
    [idempotencyKey, amount],
  );
  return rows[0];
}

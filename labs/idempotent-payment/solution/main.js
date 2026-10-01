// The unique index makes the key the thing the database refuses to duplicate, however the retries interleave.
// The insert either creates the payment or does nothing; either way we then return the one row for that key.
// A matching key with a different amount means the client reused a key by mistake, so it is refused.
async function migrate(db) {
  await db.exec("create unique index payments_idempotency_key_unique on payments (idempotency_key)");
}

async function createPayment(db, { idempotencyKey, amount }) {
  const inserted = await db.query(
    "insert into payments (idempotency_key, amount) values ($1, $2) on conflict (idempotency_key) do nothing returning id, amount",
    [idempotencyKey, amount],
  );
  const payment = inserted.rows[0]
    ?? (await db.query("select id, amount from payments where idempotency_key = $1", [idempotencyKey])).rows[0];
  if (payment.amount !== amount) throw new Error("This idempotency key was already used for a different amount.");
  return payment;
}

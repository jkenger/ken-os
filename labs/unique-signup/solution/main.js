// Between the check and the insert, another call can insert the same email, so the application check can't
// guarantee uniqueness. The database can: a unique index on lower(email) rejects the second row no matter how the
// calls interleave, and ON CONFLICT DO NOTHING turns that rejection into a normal "taken" answer.
async function migrate(db) {
  await db.exec("create unique index members_email_unique on members (lower(email))");
}

async function signUp(db, email) {
  const { rows } = await db.query(
    "insert into members (email) values ($1) on conflict (lower(email)) do nothing returning id",
    [email],
  );
  if (!rows.length) return { ok: false, reason: "taken" };
  return { ok: true, id: rows[0].id };
}

async function migrate(db) {
  // Schema changes go here.
}

async function signUp(db, email) {
  const existing = await db.query("select id from members where email = $1", [email]);
  if (existing.rows.length) return { ok: false, reason: "taken" };
  const { rows } = await db.query("insert into members (email) values ($1) returning id", [email]);
  return { ok: true, id: rows[0].id };
}

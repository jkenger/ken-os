async function transfer(db, fromId, toId, amount) {
  await db.query("update accounts set balance = balance - $1 where id = $2", [amount, fromId]);
  await db.query("update accounts set balance = balance + $1 where id = $2", [amount, toId]);
  await db.query("insert into transfers (from_id, to_id, amount) values ($1, $2, $3)", [fromId, toId, amount]);
}

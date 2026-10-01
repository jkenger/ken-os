// All three statements run in one transaction. When the trigger rejects the credit, the transaction rolls back,
// so the debit that already ran is undone too.
async function transfer(db, fromId, toId, amount) {
  await db.transaction(async (tx) => {
    await tx.query("update accounts set balance = balance - $1 where id = $2", [amount, fromId]);
    await tx.query("update accounts set balance = balance + $1 where id = $2", [amount, toId]);
    await tx.query("insert into transfers (from_id, to_id, amount) values ($1, $2, $3)", [fromId, toId, amount]);
  });
}

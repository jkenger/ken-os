`transfer(db, fromId, toId, amount)` moves money and records the transfer. Account 3 is frozen: a trigger rejects any
update that adds money to it.

Today a transfer to account 3 takes the money out of the sender, then fails, and the money is gone.
Make every transfer all or nothing: either both balances change and the transfer is recorded, or nothing changes and
the call rejects.

```js
await transfer(db, 1, 3, 20).catch(() => "rejected");
// → "rejected"
(await db.query("select id, balance from accounts order by id")).rows;
// → [{ id: 1, balance: 100 }, { id: 2, balance: 50 }, { id: 3, balance: 0 }]
```

`db` is a PGlite database. `db.query(sql, params)` runs one statement and `db.transaction(async (tx) => { ... })` runs
a callback inside a transaction that rolls back if the callback throws.

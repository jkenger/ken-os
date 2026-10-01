`transfer(db, fromId, toId, amount)` moves money and records the transfer. Account 3 is frozen: a trigger rejects any
update that adds money to it.

Today a transfer to account 3 takes the money out of the sender, then fails, and the money is gone.
Make every transfer all or nothing: either both balances change and the transfer is recorded, or nothing changes and
the call rejects.

`db` is a PGlite database. `db.query(sql, params)` runs one statement and `db.transaction(async (tx) => { ... })` runs
a callback inside a transaction that rolls back if the callback throws.

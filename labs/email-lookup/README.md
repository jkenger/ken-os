The `customers` table has 30,000 rows. `findCustomer(db, email)` works, but the query plan shows Postgres reading every
row to find one.

Add what's missing in `migrate(db)` so the lookup no longer scans the whole table. The tests read the plan with
`EXPLAIN (FORMAT JSON)` and fail on any `Seq Scan`.

Run `EXPLAIN` yourself before and after:

```js
const { rows } = await db.query("explain select * from customers where email = 'user42@example.com'");
console.log(rows.map((row) => row["QUERY PLAN"]).join("\n"));
```

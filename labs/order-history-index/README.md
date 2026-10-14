The order history page shows a user's 20 newest orders:

```sql
select * from order_history where user_id = $1 order by created_at desc limit 20
```

Someone already added an index on `(created_at, user_id)`. Busy customers load fine, but customer 9999, who has three
orders from last year, waits much longer. Fix it in `migrate(db)`.

Before you change anything, run this and note which index it uses and how many pages (`Buffers`) it touches:

```js
const { rows } = await db.query(
  "explain (analyze, buffers) select * from order_history where user_id = 9999 order by created_at desc limit 20",
);
console.log(rows.map((row) => row["QUERY PLAN"]).join("\n"));
```

The tests pass when the plan uses an index that starts with `user_id`, needs no separate sort, and touches only a few
pages.

```js
await migrate(db);
(await recentOrders(db, 9999)).map((order) => order.total);
// → [450, 800, 1200]
```

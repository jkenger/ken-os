Product 1 has 3 left in stock. Five people press Buy at the same moment, and `buyOne(db, productId)` runs five times
at once. Today all five succeed, five orders are created, and the stock still says 2.

Fix `buyOne` so that exactly as many orders succeed as there was stock, the stock ends at 0 and never goes below,
and a buyer who misses out gets `false`.

```js
await buyOne(db, 2);
// → true
(await db.query("select stock from products where id = 2")).rows[0].stock;
// → 1
```

The tests interleave the five calls between their queries, which is what two server requests do. Before you fix it,
write down which two steps of the current code let a buyer act on a number that is already out of date.

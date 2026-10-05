`listPosts(db, { cursor, limit })` returns one page of a feed, newest first: `{ items, nextCursor }`. The client
passes `nextCursor` back to get the next page, and `nextCursor` is `null` on the last page. The client never reads
the cursor; it only hands it back.

It works with `OFFSET` today, and two things go wrong:

- New posts arrive while someone is reading. When the client asks for page 2, every post has moved down, so page 2
  starts with posts they already saw.
- Deep pages are slow. To return 20 rows at offset 5,000, Postgres reads and throws away the first 5,000.

Rewrite `listPosts` so a page continues exactly after the last item the client saw, and reads only about one page of
rows however deep it is. Several posts share the same `created_at`, so the order is newest first, then by `id`
descending, and the cursor needs both. An index on `(created_at desc, id desc)` already exists.

Run this to see how many rows a deep page reads before you change anything:

```js
const { rows } = await db.query("explain (analyze) select * from posts order by created_at desc, id desc limit 20 offset 5000");
console.log(rows.map((row) => row["QUERY PLAN"]).join("\n"));
```

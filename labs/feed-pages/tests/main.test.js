const ids = (items) => items.map((item) => item.id);

async function walk(source, limit, between) {
  const seen = [];
  let cursor = null;
  for (let page = 0; page < 1000; page += 1) {
    const result = await listPosts(source, { cursor, limit });
    seen.push(...result.items);
    if (page === 0 && between) await between();
    if (!result.nextCursor) return seen;
    cursor = result.nextCursor;
  }
  throw new Error("Paging never ended: nextCursor is never null");
}

test("pages are newest first, then by id, with a null cursor at the end", async () => {
  const first = await listPosts(db, { limit: 10 });
  assert.equal(first.items.length, 10);
  assert.ok(first.nextCursor, "the first page needs a nextCursor");
  for (let index = 1; index < first.items.length; index += 1) {
    const [a, b] = [first.items[index - 1], first.items[index]];
    const ta = new Date(a.created_at).getTime(), tb = new Date(b.created_at).getTime();
    assert.ok(ta > tb || (ta === tb && a.id > b.id), "order must be created_at desc, then id desc");
  }
  const all = await walk(db, 500);
  assert.equal(all.length, 6000);
  assert.equal(new Set(ids(all)).size, 6000, "every post appears exactly once");
});

test("ties on created_at don't drop or repeat posts at a page boundary", async () => {
  const all = await walk(db, 10);
  assert.equal(new Set(ids(all)).size, 6000);
  assert.equal(all.length, 6000);
});

test("new posts arriving mid-read don't push old posts onto the next page", async () => {
  const before = (await db.query("select count(*)::int as n from posts")).rows[0].n;
  const seen = await walk(db, 25, async () => {
    await db.query("insert into posts (title, created_at) select 'Fresh ' || n, timestamptz '2027-01-01' + (n || ' seconds')::interval from generate_series(1, 7) as n");
  });
  const counts = new Map();
  for (const id of ids(seen)) counts.set(id, (counts.get(id) ?? 0) + 1);
  const repeated = [...counts].filter(([, count]) => count > 1).map(([id]) => id);
  assert.deepEqual(repeated, [], `posts shown twice: ${repeated.slice(0, 5).join(", ")}`);
  assert.equal(seen.length, before, "a reader who started before the new posts sees each older post once, and only those");
});

test("a deep page reads about one page of rows, not everything before it", async () => {
  const queries = [];
  const spy = { query: (sql, params) => { queries.push({ sql, params }); return db.query(sql, params); } };
  let cursor = null;
  for (let page = 0; page < 50; page += 1) cursor = (await listPosts(spy, { cursor, limit: 100 })).nextCursor;
  const last = queries.at(-1);
  const { rows } = await db.query(`explain (analyze, format json) ${last.sql}`, last.params);
  const nodes = [];
  const visit = (node) => { nodes.push(node); (node.Plans ?? []).forEach(visit); };
  visit(rows[0]["QUERY PLAN"][0].Plan);
  const scanned = Math.max(...nodes.filter((node) => /Scan/.test(node["Node Type"])).map((node) => node["Actual Rows"] + (node["Rows Removed by Filter"] ?? 0)));
  assert.ok(scanned <= 150, `Page 50 read ${scanned} rows from posts to return 100.`);
});

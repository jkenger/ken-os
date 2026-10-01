function planNodes(plan) {
  const nodes = [];
  const walk = (node) => { nodes.push(node); (node.Plans ?? []).forEach(walk); };
  walk(plan);
  return nodes;
}

async function explain(sql) {
  const { rows } = await db.query(`explain (analyze, buffers, format json) ${sql}`);
  return { root: rows[0]["QUERY PLAN"][0].Plan, nodes: planNodes(rows[0]["QUERY PLAN"][0].Plan) };
}

async function firstColumn(indexName) {
  const { rows } = await db.query(
    `select a.attname from pg_index i
       join pg_class c on c.oid = i.indexrelid
       join pg_attribute a on a.attrelid = i.indrelid and a.attnum = i.indkey[0]
     where c.relname = $1`,
    [indexName],
  );
  return rows[0]?.attname;
}

const query = (userId) => `select * from order_history where user_id = ${userId} order by created_at desc limit 20`;

test("migrate runs", async () => {
  await migrate(db);
});

test("recentOrders returns the newest orders for that user", async () => {
  const rows = await recentOrders(db, 42);
  assert.equal(rows.length, 20);
  assert.ok(rows.every((row) => row.user_id === 42));
  const times = rows.map((row) => new Date(row.created_at).getTime());
  assert.deepEqual(times, [...times].sort((a, b) => b - a), "rows must be newest first");
  assert.equal((await recentOrders(db, 9999)).length, 3);
});

test("the plan uses an index that starts with user_id", async () => {
  const { nodes } = await explain(query(9999));
  const scan = nodes.find((node) => node["Index Name"]);
  assert.ok(scan, `No index is used: ${nodes.map((node) => node["Node Type"]).join(" > ")}`);
  const leading = await firstColumn(scan["Index Name"]);
  assert.equal(leading, "user_id", `The plan uses ${scan["Index Name"]}, which is sorted by ${leading} first, so one user's rows are spread through the whole index.`);
});

test("the plan needs no separate sort and reads only a few pages", async () => {
  const { root, nodes } = await explain(query(9999));
  const types = nodes.map((node) => node["Node Type"]);
  assert.ok(!types.includes("Sort"), `The plan still sorts: ${types.join(" > ")}`);
  const pages = (root["Shared Hit Blocks"] ?? 0) + (root["Shared Read Blocks"] ?? 0);
  assert.ok(pages < 20, `The query touched ${pages} pages for 3 rows.`);
});

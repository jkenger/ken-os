function planNodes(plan) {
  const nodes = [];
  const walk = (node) => { nodes.push(node); (node.Plans ?? []).forEach(walk); };
  walk(plan);
  return nodes;
}

async function explain(sql) {
  const { rows } = await db.query(`explain (format json) ${sql}`);
  return planNodes(rows[0]["QUERY PLAN"][0].Plan);
}

test("migrate runs", async () => {
  await migrate(db);
});

test("findCustomer still finds the right customer", async () => {
  const customer = await findCustomer(db, "user42@example.com");
  assert.equal(customer?.name, "Customer 42");
  assert.equal(await findCustomer(db, "nobody@example.com"), null);
});

test("the lookup does not scan the whole table", async () => {
  const nodes = await explain("select * from customers where email = 'user42@example.com'");
  const types = nodes.map((node) => node["Node Type"]);
  assert.ok(!types.includes("Seq Scan"), `The plan still reads every row: ${types.join(" > ")}`);
});

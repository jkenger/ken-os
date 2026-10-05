const insertInvoice = (tenantId, customerId, number) =>
  db.query("insert into invoices (tenant_id, customer_id, number) values ($1, $2, $3)", [tenantId, customerId, number]);

test("migrate runs and keeps the existing invoice", async () => {
  await migrate(db);
  const { rows } = await db.query("select number from invoices");
  assert.deepEqual(rows.map((row) => row.number), ["INV-1"]);
});

test("an invoice can't point at another tenant's customer", async () => {
  await assert.rejects(() => insertInvoice(1, 2, "INV-2"), "tenant 1's invoice must not reference tenant 2's customer");
});

test("an invoice for its own tenant's customer is fine", async () => {
  await insertInvoice(1, 1, "INV-2");
  await insertInvoice(2, 2, "INV-9");
});

test("each tenant numbers its own invoices", async () => {
  await insertInvoice(2, 2, "INV-1");
  await assert.rejects(() => insertInvoice(1, 1, "INV-1"), "a duplicate number within one tenant must still be rejected");
});

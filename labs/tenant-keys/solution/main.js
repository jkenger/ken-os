// In a shared database, tenant isolation is only as strong as the weakest query, so put it in the schema too. A
// composite foreign key on (tenant_id, customer_id) makes the database refuse an invoice whose customer belongs to a
// different tenant; it needs a unique key on customers (tenant_id, id) to point at. Uniqueness that is really per
// tenant (invoice numbers) includes tenant_id. Row-level security can add a second guard on reads. A separate database
// per tenant gives the strongest isolation at the cost of running many databases, which pays off for a few large or
// regulated customers.
async function migrate(db) {
  await db.exec(`
    alter table customers add constraint customers_tenant_id_key unique (tenant_id, id);
    alter table invoices drop constraint invoices_customer_fk;
    alter table invoices add constraint invoices_customer_fk
      foreign key (tenant_id, customer_id) references customers (tenant_id, id);
    alter table invoices drop constraint invoices_number_key;
    alter table invoices add constraint invoices_number_key unique (tenant_id, number);
  `);
}

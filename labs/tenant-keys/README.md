An invoicing app serves many companies (tenants) from one database. Every customer and invoice row has a
`tenant_id`, but the schema doesn't enforce it, so two bugs are possible:

- An invoice for tenant 1 can point at a customer who belongs to tenant 2. One wrong id in the API, and a company sees
  another company's customer on its invoice.
- Invoice numbers are unique across the whole database, so a second company can't have its own `INV-1`.

Write `migrate(db)` so the database itself makes both impossible, whatever the application code does:

- An invoice's customer must belong to the same tenant as the invoice. A composite foreign key on
  `(tenant_id, customer_id)` does this; it needs a matching unique key on `customers (tenant_id, id)`.
- Invoice numbers are unique per tenant, not globally.

The existing constraints are named `invoices_customer_fk` and `invoices_number_key`. Then explain why this belongs in
the schema even when every query already filters by tenant, and when a separate database per tenant is worth it.

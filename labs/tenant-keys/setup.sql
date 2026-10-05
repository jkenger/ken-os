create table tenants (id int primary key, name text not null);
create table customers (
  id serial primary key,
  tenant_id int not null references tenants,
  name text not null
);
create table invoices (
  id serial primary key,
  tenant_id int not null references tenants,
  customer_id int not null,
  number text not null,
  constraint invoices_customer_fk foreign key (customer_id) references customers (id),
  constraint invoices_number_key unique (number)
);
insert into tenants (id, name) values (1, 'Acme'), (2, 'Globex');
insert into customers (tenant_id, name) values (1, 'Acme customer'), (2, 'Globex customer');
insert into invoices (tenant_id, customer_id, number) values (1, 1, 'INV-1');

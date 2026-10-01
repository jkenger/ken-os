create table products (
  id int primary key,
  name text not null,
  stock int not null
);
insert into products values (1, 'Desk lamp', 3), (2, 'Notebook', 2);

create table orders (
  id serial primary key,
  product_id int not null references products (id),
  created_at timestamptz not null default now()
);

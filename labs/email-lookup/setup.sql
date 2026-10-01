create table customers (
  id serial primary key,
  email text not null,
  name text not null
);
insert into customers (email, name)
select 'user' || n || '@example.com', 'Customer ' || n from generate_series(1, 30000) as n;
analyze customers;

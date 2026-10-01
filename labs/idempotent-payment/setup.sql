create table payments (
  id serial primary key,
  idempotency_key text not null,
  amount int not null,
  created_at timestamptz not null default now()
);

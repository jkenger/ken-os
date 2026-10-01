create table members (
  id serial primary key,
  email text not null,
  created_at timestamptz not null default now()
);

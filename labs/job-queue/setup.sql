create table jobs (
  id serial primary key,
  type text not null,
  payload jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'running', 'done', 'dead')),
  attempts int not null default 0,
  run_after timestamptz not null default now(),
  locked_by text,
  locked_at timestamptz,
  last_error text
);

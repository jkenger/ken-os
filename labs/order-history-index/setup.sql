create table order_history (
  id serial primary key,
  user_id int not null,
  status text not null,
  total int not null,
  created_at timestamptz not null
);
insert into order_history (user_id, status, total, created_at)
select (n % 600) + 1, case when n % 7 = 0 then 'refunded' else 'paid' end, (n * 37) % 9000, timestamptz '2026-01-01' + (n || ' minutes')::interval
from generate_series(1, 60000) as n;
-- A customer with only three orders, all from last year: the slow case for the existing index.
insert into order_history (user_id, status, total, created_at) values
  (9999, 'paid', 1200, timestamptz '2025-03-02'), (9999, 'paid', 800, timestamptz '2025-06-14'), (9999, 'refunded', 450, timestamptz '2025-09-30');
create index order_history_created_user_idx on order_history (created_at, user_id);
analyze order_history;

create table posts (
  id serial primary key,
  title text not null,
  created_at timestamptz not null
);
-- 6,000 posts, three per minute, so posts share timestamps and a page boundary can fall inside a tie.
insert into posts (title, created_at)
select 'Post ' || n, timestamptz '2026-06-01' + ((n / 3) || ' minutes')::interval
from generate_series(1, 6000) as n;
create index posts_created_id_idx on posts (created_at desc, id desc);
analyze posts;

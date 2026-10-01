create table accounts (
  id int primary key,
  owner text not null,
  balance int not null check (balance >= 0),
  frozen boolean not null default false
);
insert into accounts values (1, 'ana', 100, false), (2, 'ben', 50, false), (3, 'cy', 0, true);

create table transfers (
  id serial primary key,
  from_id int not null,
  to_id int not null,
  amount int not null,
  created_at timestamptz not null default now()
);

-- A frozen account cannot receive money.
create function block_frozen() returns trigger as $$
begin
  if new.frozen and new.balance > old.balance then
    raise exception 'account % is frozen', new.id;
  end if;
  return new;
end
$$ language plpgsql;
create trigger accounts_frozen before update on accounts for each row execute function block_frozen();

// During a deploy, old and new code run against the same database, so every schema change must work for both. Expand
// first: add the new column, backfill it, and keep both columns in step (here with a trigger) so either version can
// write. Ship the new code. Contract only once the old code is gone: drop the sync and the old column, then tighten
// constraints. Adding a required column follows the same order: add it nullable, backfill, deploy code that writes it,
// then set NOT NULL. A one-step rename breaks every request still on the old version.
async function expand(db) {
  await db.exec(`
    alter table users add column display_name text;
    update users set display_name = fullname;
    create function users_sync_name() returns trigger language plpgsql as $$
    begin
      if tg_op = 'INSERT' then
        new.display_name := coalesce(new.display_name, new.fullname);
        new.fullname := coalesce(new.fullname, new.display_name);
      elsif new.fullname is distinct from old.fullname then
        new.display_name := new.fullname;
      elsif new.display_name is distinct from old.display_name then
        new.fullname := new.display_name;
      end if;
      return new;
    end
    $$;
    create trigger users_sync_name before insert or update on users
      for each row execute function users_sync_name();
  `);
}

async function contract(db) {
  await db.exec(`
    drop trigger users_sync_name on users;
    drop function users_sync_name();
    alter table users drop column fullname;
    alter table users alter column display_name set not null;
  `);
}

async function createUser(db, name) {
  const { rows } = await db.query("insert into users (display_name) values ($1) returning *", [name]);
  return rows[0];
}

async function renameUser(db, id, name) {
  await db.query("update users set display_name = $2 where id = $1", [id, name]);
}

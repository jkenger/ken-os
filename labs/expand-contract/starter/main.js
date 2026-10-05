async function expand(db) {
  await db.exec("alter table users rename column fullname to display_name");
}

async function contract(db) {
  // Nothing left to do.
}

async function createUser(db, name) {
  const { rows } = await db.query("insert into users (display_name) values ($1) returning *", [name]);
  return rows[0];
}

async function renameUser(db, id, name) {
  await db.query("update users set display_name = $2 where id = $1", [id, name]);
}

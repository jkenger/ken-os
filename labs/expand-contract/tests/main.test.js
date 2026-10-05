// The old version of the app, still running during the deploy.
async function oldCreateUser(db, name) {
  const { rows } = await db.query("insert into users (fullname) values ($1) returning id", [name]);
  return rows[0].id;
}
async function oldRename(db, id, name) {
  await db.query("update users set fullname = $2 where id = $1", [id, name]);
}
const row = async (id) => (await db.query("select * from users where id = $1", [id])).rows[0];

test("expand copies the existing names", async () => {
  await expand(db);
  assert.equal((await row(1)).display_name, "Ana Reyes");
  assert.equal((await row(2)).display_name, "Ben Cruz");
});

test("the old version keeps working, and the new column follows it", async () => {
  const id = await oldCreateUser(db, "Cy Tan");
  assert.equal((await row(id)).display_name, "Cy Tan");
  await oldRename(db, 1, "Ana R.");
  assert.equal((await row(1)).display_name, "Ana R.");
});

test("the new version works, and the old column follows it", async () => {
  const created = await createUser(db, "Dee Lim");
  assert.equal((await row(created.id)).fullname, "Dee Lim", "the old version reads fullname, so it must be filled");
  await renameUser(db, 2, "Ben C.");
  assert.equal((await row(2)).fullname, "Ben C.");
});

test("contract removes the old column and makes the new one required", async () => {
  await contract(db);
  const { rows } = await db.query("select column_name, is_nullable from information_schema.columns where table_name = 'users' order by column_name");
  assert.deepEqual(rows.map((item) => item.column_name), ["display_name", "id"]);
  assert.equal(rows.find((item) => item.column_name === "display_name").is_nullable, "NO");
  const created = await createUser(db, "Eli Go");
  assert.equal((await row(created.id)).display_name, "Eli Go");
});

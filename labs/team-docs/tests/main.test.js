const ana = { userId: 1 },
  ben = { userId: 2 },
  cy = { userId: 3 },
  dee = { userId: 4 };
const titleOf = async (id) => (await db.query("select title from documents where id = $1", [id])).rows[0].title;

test("members read their organisation's documents", async () => {
  assert.equal((await getDocument(db, ana, 1))?.title, "Roadmap");
  assert.equal((await getDocument(db, ben, 2))?.title, "Pricing", "viewers can read");
  assert.equal((await getDocument(db, cy, 3))?.title, "Plans");
});

test("an outsider gets null, exactly as for a document that doesn't exist", async () => {
  assert.equal(await getDocument(db, cy, 1), null, "Cy is in Globex, not Acme");
  assert.equal(await getDocument(db, dee, 1), null, "Dee isn't in any organisation");
  assert.equal(await getDocument(db, ana, 3), null);
  assert.equal(await getDocument(db, ana, 999), null);
});

test("listing is limited to members", async () => {
  assert.deepEqual(
    (await listDocuments(db, ana, 1)).map((doc) => doc.title),
    ["Roadmap", "Pricing"],
  );
  assert.deepEqual(await listDocuments(db, cy, 1), []);
  assert.deepEqual(await listDocuments(db, dee, 2), []);
});

test("a viewer can't edit", async () => {
  await assert.rejects(() => updateDocument(db, ben, 1, { title: "Hacked", body: "x" }), /forbidden/i);
  assert.equal(await titleOf(1), "Roadmap");
});

test("an editor can edit; an outsider can't, and can't tell the document exists", async () => {
  const updated = await updateDocument(db, ana, 1, { title: "Roadmap v2", body: "Ship the beta in June" });
  assert.equal(updated?.title, "Roadmap v2");
  assert.equal(await updateDocument(db, cy, 2, { title: "Hacked", body: "x" }), null);
  assert.equal(await titleOf(2), "Pricing");
  assert.equal(await updateDocument(db, dee, 999, { title: "x", body: "x" }), null);
});

test("signed-out callers are turned away", async () => {
  await assert.rejects(() => getDocument(db, null, 1), /sign in/i);
  await assert.rejects(() => listDocuments(db, null, 1), /sign in/i);
  await assert.rejects(() => updateDocument(db, null, 1, { title: "x", body: "x" }), /sign in/i);
});

test("removing a member takes effect at once", async () => {
  await db.query("delete from memberships where user_id = 1 and org_id = 1");
  assert.equal(await getDocument(db, ana, 1), null);
  assert.deepEqual(await listDocuments(db, ana, 1), []);
  assert.equal(await updateDocument(db, ana, 1, { title: "Late edit", body: "x" }), null);
  assert.equal(await titleOf(1), "Roadmap v2");
});

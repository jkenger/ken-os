async function getDocument(db, actor, docId) {
  if (!actor) throw new Error("Please sign in");
  const { rows } = await db.query("select * from documents where id = $1", [docId]);
  return rows[0] ?? null;
}

async function listDocuments(db, actor, orgId) {
  if (!actor) throw new Error("Please sign in");
  const { rows } = await db.query("select * from documents where org_id = $1 order by id", [orgId]);
  return rows;
}

async function updateDocument(db, actor, docId, changes) {
  const doc = await getDocument(db, actor, docId);
  if (!doc) return null;
  const { rows } = await db.query("update documents set title = $1, body = $2 where id = $3 returning *", [
    changes.title,
    changes.body,
    docId,
  ]);
  return rows[0];
}

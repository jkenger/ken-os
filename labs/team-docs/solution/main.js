// Authentication says who you are; authorization says what you may touch. Being signed in proves the first and none
// of the second: every read and write must also check that this actor belongs to the document's organisation, with a
// role that allows the action. Put the membership in the same query as the read or write, so there's no gap between
// checking and doing, and a removed member loses access on their very next request. Answer an outsider exactly as
// you'd answer for a missing document, so ids can't be probed. Only the role decides between "forbidden" (a member
// who may not do this) and "not found" (everyone else).
function requireActor(actor) {
  if (!actor) throw new Error("Please sign in");
}

async function getDocument(db, actor, docId) {
  requireActor(actor);
  const { rows } = await db.query(
    `select d.* from documents d
       join memberships m on m.org_id = d.org_id and m.user_id = $2
     where d.id = $1`,
    [docId, actor.userId],
  );
  return rows[0] ?? null;
}

async function listDocuments(db, actor, orgId) {
  requireActor(actor);
  const { rows } = await db.query(
    `select d.* from documents d
       join memberships m on m.org_id = d.org_id and m.user_id = $2
     where d.org_id = $1
     order by d.id`,
    [orgId, actor.userId],
  );
  return rows;
}

async function updateDocument(db, actor, docId, changes) {
  requireActor(actor);
  const { rows: access } = await db.query(
    `select m.role from documents d
       join memberships m on m.org_id = d.org_id and m.user_id = $2
     where d.id = $1`,
    [docId, actor.userId],
  );
  if (!access.length) return null;
  if (access[0].role === "viewer") throw new Error("Forbidden: viewers can't edit");
  // The role is checked again in the write itself, so a role changed in between can't slip through.
  const { rows } = await db.query(
    `update documents d set title = $1, body = $2
       from memberships m
     where d.id = $3 and m.org_id = d.org_id and m.user_id = $4 and m.role in ('editor', 'admin')
     returning d.*`,
    [changes.title, changes.body, docId, actor.userId],
  );
  return rows[0] ?? null;
}

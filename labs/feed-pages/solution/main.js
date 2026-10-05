// Keyset (cursor) pagination. An offset counts rows from the top, so when new posts arrive the same offset points
// at different rows, and Postgres must read and discard every skipped row. A cursor remembers the last row the
// client saw instead, and the next page asks for rows strictly after it in the same order. created_at alone isn't
// unique (several posts share a minute), so the cursor holds (created_at, id) and compares them as a row value,
// matching the index on (created_at desc, id desc). The index then jumps straight to the cursor and reads one page.
// The cursor is opaque to the client: encoded, so nobody depends on its shape and it can change later. A real API
// would also sign it, so a client can't hand-craft one.
function encodeCursor(row) {
  return encodeURIComponent(JSON.stringify([new Date(row.created_at).toISOString(), row.id]));
}

function decodeCursor(cursor) {
  const [createdAt, id] = JSON.parse(decodeURIComponent(cursor));
  return { createdAt, id };
}

async function listPosts(db, { cursor = null, limit = 20 } = {}) {
  const after = cursor ? decodeCursor(cursor) : null;
  const { rows } = after
    ? await db.query(
      "select id, title, created_at from posts where (created_at, id) < ($1::timestamptz, $2) order by created_at desc, id desc limit $3",
      [after.createdAt, after.id, limit + 1],
    )
    : await db.query("select id, title, created_at from posts order by created_at desc, id desc limit $1", [limit + 1]);
  const items = rows.slice(0, limit);
  return { items, nextCursor: rows.length > limit ? encodeCursor(items[items.length - 1]) : null };
}

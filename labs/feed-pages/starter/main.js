async function listPosts(db, { cursor = null, limit = 20 } = {}) {
  const offset = cursor ? Number(cursor) : 0;
  const { rows } = await db.query(
    "select id, title, created_at from posts order by created_at desc, id desc limit $1 offset $2",
    [limit + 1, offset],
  );
  const items = rows.slice(0, limit);
  return { items, nextCursor: rows.length > limit ? String(offset + limit) : null };
}

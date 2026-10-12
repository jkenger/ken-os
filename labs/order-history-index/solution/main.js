// A composite index is sorted by its first column, then by the next within each value of the first. With
// (created_at, user_id), one user's rows are spread through the whole index. Postgres walks it newest first and
// checks user_id on every entry; for a customer whose orders are all old, that means reading nearly the whole index.
// With (user_id, created_at desc), one user's rows sit together, already newest first: the scan jumps to user 9999,
// reads its three entries and stops, with no sort.
async function migrate(db) {
  await db.exec("create index order_history_user_created_idx on order_history (user_id, created_at desc)");
  await db.exec("drop index order_history_created_user_idx");
}

async function recentOrders(db, userId) {
  const { rows } = await db.query("select * from order_history where user_id = $1 order by created_at desc limit 20", [
    userId,
  ]);
  return rows;
}

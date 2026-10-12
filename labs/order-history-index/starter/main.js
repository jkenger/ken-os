async function migrate(db) {
  // Schema changes go here.
}

async function recentOrders(db, userId) {
  const { rows } = await db.query("select * from order_history where user_id = $1 order by created_at desc limit 20", [
    userId,
  ]);
  return rows;
}

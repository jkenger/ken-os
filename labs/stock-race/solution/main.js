// The original read the stock, then wrote back a number computed from that read. Every buyer read 3 before anyone
// wrote, so each wrote 2: a lost update. One conditional UPDATE does the check and the change together, so no
// buyer can act on an old value. RETURNING tells us whether this buyer got an item.
async function buyOne(db, productId) {
  const { rows } = await db.query("update products set stock = stock - 1 where id = $1 and stock > 0 returning stock", [
    productId,
  ]);
  if (!rows.length) return false;
  await db.query("insert into orders (product_id) values ($1)", [productId]);
  return true;
}

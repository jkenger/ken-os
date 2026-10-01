async function buyOne(db, productId) {
  const { rows } = await db.query("select stock from products where id = $1", [productId]);
  if (rows[0].stock < 1) return false;
  await db.query("update products set stock = $1 where id = $2", [rows[0].stock - 1, productId]);
  await db.query("insert into orders (product_id) values ($1)", [productId]);
  return true;
}

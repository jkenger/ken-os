async function stockOf(productId) {
  return (await db.query("select stock from products where id = $1", [productId])).rows[0].stock;
}

async function ordersFor(productId) {
  return (await db.query("select count(*)::int as n from orders where product_id = $1", [productId])).rows[0].n;
}

test("five buyers, three in stock: exactly three orders", async () => {
  const results = await Promise.all(Array.from({ length: 5 }, () => buyOne(db, 1)));
  assert.equal(results.filter(Boolean).length, 3, "three buyers should succeed");
  assert.equal(await ordersFor(1), 3);
  assert.equal(await stockOf(1), 0);
});

test("stock never goes below zero", async () => {
  await Promise.all(Array.from({ length: 6 }, () => buyOne(db, 2)));
  assert.equal(await stockOf(2), 0);
  assert.equal(await ordersFor(2), 2);
});

test("a sold-out product returns false", async () => {
  assert.equal(await buyOne(db, 1), false);
});

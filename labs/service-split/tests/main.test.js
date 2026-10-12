test("inventory exposes only its two calls", () => {
  const inventory = createInventory({ lamp: 3 });
  assert.deepEqual(Object.keys(inventory).sort(), ["available", "reserve"]);
});

test("a reservation takes stock only when there is enough", () => {
  const inventory = createInventory({ lamp: 3 });
  assert.equal(inventory.reserve("lamp", 2), true);
  assert.equal(inventory.reserve("lamp", 2), false);
  assert.equal(inventory.available("lamp"), 1);
});

test("an order goes through inventory's API", async () => {
  const inventory = createInventory({ lamp: 3 });
  const orders = createOrders(inventory);
  assert.deepEqual(await orders.place("lamp", 2), { ok: true });
  assert.equal(inventory.available("lamp"), 1);
  assert.deepEqual(orders.list(), [{ sku: "lamp", quantity: 2 }]);
});

test("orders works with a remote inventory", async () => {
  const remote = { available: async () => 5, reserve: async () => true };
  const orders = createOrders(remote);
  assert.deepEqual(await orders.place("desk", 1), { ok: true });
});

test("a refused reservation creates no order", async () => {
  const orders = createOrders({ available: async () => 0, reserve: async () => false });
  assert.deepEqual(await orders.place("desk", 1), { ok: false, reason: "out_of_stock" });
  assert.deepEqual(orders.list(), []);
});

test("inventory being down creates no order", async () => {
  const orders = createOrders({
    available: async () => 0,
    reserve: async () => {
      throw new Error("ECONNREFUSED");
    },
  });
  assert.deepEqual(await orders.place("desk", 1), { ok: false, reason: "inventory_unavailable" });
  assert.deepEqual(orders.list(), []);
});

function createInventory(stock) {
  return { table: new Map(Object.entries(stock)) };
}

function createOrders(inventory) {
  const orders = [];
  return {
    place(sku, quantity) {
      const left = inventory.table.get(sku) ?? 0;
      if (left < quantity) return { ok: false, reason: "out_of_stock" };
      inventory.table.set(sku, left - quantity);
      orders.push({ sku, quantity });
      return { ok: true };
    },
    list() {
      return [...orders];
    },
  };
}

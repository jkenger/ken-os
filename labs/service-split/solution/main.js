// Inventory owns its stock; nobody else touches the Map. Orders only knows the two calls inventory offers, so
// inventory can change its storage, or move behind the network, without orders noticing. A call across a network can
// fail even when both sides are fine, so place treats a thrown reservation as "unavailable" and records nothing.
function createInventory(stock) {
  const table = new Map(Object.entries(stock));
  return {
    available(sku) {
      return table.get(sku) ?? 0;
    },
    reserve(sku, quantity) {
      const left = table.get(sku) ?? 0;
      if (left < quantity) return false;
      table.set(sku, left - quantity);
      return true;
    },
  };
}

function createOrders(inventory) {
  const orders = [];
  return {
    async place(sku, quantity) {
      let reserved;
      try {
        reserved = await inventory.reserve(sku, quantity);
      } catch {
        return { ok: false, reason: "inventory_unavailable" };
      }
      if (!reserved) return { ok: false, reason: "out_of_stock" };
      orders.push({ sku, quantity });
      return { ok: true };
    },
    list() {
      return [...orders];
    },
  };
}

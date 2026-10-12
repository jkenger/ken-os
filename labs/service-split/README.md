Make orders talk to inventory only through its API, and survive when inventory is down.

Inventory and orders are about to become two services. Today `createOrders` reads and writes the inventory's stock
table directly, so the two can't be separated, and any change to that table breaks orders.

- `createInventory(stock)` keeps its stock private and returns only two functions: `available(sku)` returns how many
  are left, and `reserve(sku, quantity)` takes them if there are enough and returns `true`, or changes nothing and
  returns `false`.
- `createOrders(inventory)` returns `place(sku, quantity)` and `list()`. `place` works with any object that has those
  two functions, because soon it will be a network client. It returns `{ ok: true }`, `{ ok: false, reason:
"out_of_stock" }`, or `{ ok: false, reason: "inventory_unavailable" }` when the call throws. Only a successful
  reservation creates an order.

Then write one sentence on what the network hop between the two adds that a function call didn't have.

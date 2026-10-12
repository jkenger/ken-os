// Fake services that record every call. `failing` names the calls that throw.
function fakeServices(failing = []) {
  const log = [];
  const step = (name, result) => async (arg) => {
    log.push(name);
    if (failing.includes(name)) throw new Error(`${name} failed`);
    return result;
  };
  return {
    log,
    services: {
      inventory: { reserve: step("reserve", "res_1"), release: step("release", true) },
      payments: { charge: step("charge", "ch_1"), refund: step("refund", true) },
      shipping: { create: step("ship", "sh_1") },
    },
  };
}
const order = { items: [{ sku: "ABC-1234", quantity: 1 }], total: 2500, address: "1 Main St" };

test("a successful order returns every id and undoes nothing", async () => {
  const { log, services } = fakeServices();
  assert.deepEqual(await placeOrder(services, order), {
    ok: true,
    reservationId: "res_1",
    chargeId: "ch_1",
    shipmentId: "sh_1",
  });
  assert.deepEqual(log, ["reserve", "charge", "ship"]);
});

test("a failed charge releases the stock", async () => {
  const { log, services } = fakeServices(["charge"]);
  const result = await placeOrder(services, order);
  assert.equal(result.ok, false);
  assert.equal(result.failedAt, "payments");
  assert.equal(result.error, "charge failed");
  assert.deepEqual(log, ["reserve", "charge", "release"]);
});

test("a failed shipment refunds, then releases, newest first", async () => {
  const { log, services } = fakeServices(["ship"]);
  const result = await placeOrder(services, order);
  assert.equal(result.failedAt, "shipping");
  assert.deepEqual(log, ["reserve", "charge", "ship", "refund", "release"]);
});

test("a failed reservation has nothing to undo", async () => {
  const { log, services } = fakeServices(["reserve"]);
  const result = await placeOrder(services, order);
  assert.equal(result.failedAt, "inventory");
  assert.deepEqual(log, ["reserve"]);
});

test("a failed undo doesn't stop the others or hide the real failure", async () => {
  const { log, services } = fakeServices(["ship", "refund"]);
  const result = await placeOrder(services, order);
  assert.equal(result.failedAt, "shipping");
  assert.equal(result.error, "ship failed");
  assert.deepEqual(result.compensationErrors, ["refund failed"]);
  assert.deepEqual(
    log,
    ["reserve", "charge", "ship", "refund", "release"],
    "the release still runs after the refund fails",
  );
});

// Across services there's no shared transaction to roll back, so each step that succeeds registers how to undo itself,
// and a failure runs those undo steps newest first (a saga). An undo can fail too, so keep going with the rest and
// report it for a person to resolve, without hiding the original failure. Undo steps get retried, so they must be safe
// to run twice: refunding the same charge twice must not pay out twice.
async function placeOrder(services, order) {
  const undo = [];
  const run = async (name, action, compensate) => {
    try {
      const result = await action();
      if (compensate) undo.push(() => compensate(result));
      return result;
    } catch (error) {
      error.step = name;
      throw error;
    }
  };
  try {
    const reservationId = await run(
      "inventory",
      () => services.inventory.reserve(order.items),
      (id) => services.inventory.release(id),
    );
    const chargeId = await run(
      "payments",
      () => services.payments.charge(order.total),
      (id) => services.payments.refund(id),
    );
    const shipmentId = await run("shipping", () => services.shipping.create(order.address));
    return { ok: true, reservationId, chargeId, shipmentId };
  } catch (error) {
    const compensationErrors = [];
    for (const step of undo.reverse()) {
      try {
        await step();
      } catch (undoError) {
        compensationErrors.push(undoError.message);
      }
    }
    return { ok: false, failedAt: error.step, error: error.message, compensationErrors };
  }
}

async function placeOrder(services, order) {
  try {
    const reservationId = await services.inventory.reserve(order.items);
    const chargeId = await services.payments.charge(order.total);
    const shipmentId = await services.shipping.create(order.address);
    return { ok: true, reservationId, chargeId, shipmentId };
  } catch (error) {
    return { ok: false, failedAt: "unknown", error: error.message, compensationErrors: [] };
  }
}

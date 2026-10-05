Placing an order touches three services that don't share a database, so one transaction can't cover them:

1. `services.inventory.reserve(order.items)` returns a reservation id.
2. `services.payments.charge(order.total)` returns a charge id.
3. `services.shipping.create(order.address)` returns a shipment id.

Any step can fail after the earlier ones succeeded. The starter just reports the failure, leaving stock reserved and
the card charged for an order that will never ship. Write `placeOrder(services, order)` so that:

- On success it returns `{ ok: true, reservationId, chargeId, shipmentId }`.
- When a step fails, it undoes the steps that already succeeded, newest first: `payments.refund(chargeId)`, then
  `inventory.release(reservationId)`. It returns `{ ok: false, failedAt, error, compensationErrors }`, where
  `failedAt` is `"inventory"`, `"payments"` or `"shipping"` and `error` is the failure's message.
- If an undo step fails too, it keeps going with the rest and lists the message in `compensationErrors`; the
  original failure stays the one reported.

Then explain why each undo step must be safe to run twice, and what a person should see when an undo fails.

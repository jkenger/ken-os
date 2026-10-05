function parseOrder(body) {
  if (!body.email || !body.email.includes("@")) {
    return { ok: false, errors: [{ path: "email", message: "Enter an email address" }] };
  }
  const quantity = Number(body.quantity);
  if (quantity < 1 || quantity > 100) {
    return { ok: false, errors: [{ path: "quantity", message: "Quantity must be 1 to 100" }] };
  }
  return { ok: true, value: { ...body, quantity } };
}

// Parse, don't just check. The body is untrusted: types are erased at runtime, so a TypeScript type on the handler
// proves nothing about what arrived. Build a new value from the fields you define, each one checked and normalized,
// and never spread the body: spreading lets extra fields such as price or isAdmin reach the database (mass assignment).
// Collect every error instead of stopping at the first, and treat "3" as the string it is rather than coercing it.
function parseOrder(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, errors: [{ path: "body", message: "Expected a JSON object" }] };
  }
  const errors = [];

  let email = null;
  if (typeof body.email === "string" && /^[^\s@]+@[^\s@]+$/.test(body.email.trim())) {
    email = body.email.trim().toLowerCase();
  } else {
    errors.push({ path: "email", message: "Enter an email address" });
  }

  let sku = null;
  if (typeof body.sku === "string" && /^[A-Z]{3}-\d{4}$/.test(body.sku)) sku = body.sku;
  else errors.push({ path: "sku", message: "Use the format ABC-1234" });

  let quantity = null;
  if (Number.isInteger(body.quantity) && body.quantity >= 1 && body.quantity <= 100) quantity = body.quantity;
  else errors.push({ path: "quantity", message: "Quantity must be a whole number from 1 to 100" });

  let note = null;
  if (body.note !== undefined && body.note !== null) {
    if (typeof body.note === "string" && body.note.length <= 200) note = body.note;
    else errors.push({ path: "note", message: "Note must be text of at most 200 characters" });
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { email, sku, quantity, note } };
}

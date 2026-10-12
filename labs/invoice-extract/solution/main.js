// A model's reply is untrusted text. Ask for an exact shape, read it leniently (models wrap JSON in fences and
// sentences), then validate strictly, the same way you'd parse a request body. If it's wrong, one repair attempt that
// shows the model its reply and the specific errors usually fixes it; after that, fail clearly rather than guess.
// Provider structured-output modes guarantee the JSON matches a schema's shape, which removes the parsing step, but
// not that the values are right (a wrong total still passes), so the checks and the failure path stay in your code.
const FIELDS = "vendor (string), total (number), currency (3-letter code like USD), date (YYYY-MM-DD)";

function readJson(reply) {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(reply);
  const body = fenced ? fenced[1] : reply;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end < start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    return null;
  }
}

function validate(data) {
  if (!data || typeof data !== "object") return { errors: ["The reply had no JSON object"] };
  const errors = [];
  if (typeof data.vendor !== "string" || !data.vendor.trim()) errors.push("vendor must be a non-empty string");
  if (typeof data.total !== "number" || !Number.isFinite(data.total) || data.total < 0)
    errors.push("total must be a number of at least 0, with no currency symbol");
  if (typeof data.currency !== "string" || !/^[A-Z]{3}$/.test(data.currency))
    errors.push("currency must be three capital letters, like USD");
  if (typeof data.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) errors.push("date must be YYYY-MM-DD");
  if (errors.length) return { errors };
  return { value: { vendor: data.vendor, total: data.total, currency: data.currency, date: data.date } };
}

async function extractInvoice(callModel, text) {
  const messages = [
    {
      role: "user",
      content: `Extract the invoice details from the email below. Reply with only a JSON object with exactly these fields: ${FIELDS}.\n\nEmail:\n${text}`,
    },
  ];
  let result = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const reply = await callModel(messages);
    result = validate(readJson(reply));
    if (result.value) return { ok: true, value: result.value, attempts: attempt };
    messages.push({ role: "assistant", content: reply });
    messages.push({
      role: "user",
      content: `That reply can't be used: ${result.errors.join("; ")}. Reply again with only the corrected JSON object.`,
    });
  }
  return { ok: false, errors: result.errors, attempts: 2 };
}

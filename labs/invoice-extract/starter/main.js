async function extractInvoice(callModel, text) {
  const reply = await callModel([{ role: "user", content: `Extract the invoice details as JSON:\n${text}` }]);
  return { ok: true, value: JSON.parse(reply), attempts: 1 };
}

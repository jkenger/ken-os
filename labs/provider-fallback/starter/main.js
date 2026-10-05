async function generate(providers, prompt, { timeoutMs }) {
  const [first] = providers;
  const reply = await first.call(prompt, {});
  return { ok: true, text: reply.text, provider: first.name, attempts: [{ provider: first.name, outcome: "ok" }] };
}

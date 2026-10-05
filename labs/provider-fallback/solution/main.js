// A fallback chain is a retry policy across providers. Move on only for failures another provider might not have:
// timeouts, rate limits, server errors, network errors and empty output. A bad request fails the same everywhere, and
// a safety refusal shouldn't be shopped around until something says yes. Each call gets a deadline and is aborted when
// it passes. Providers differ in tokenizers, context limits, tool-call formats and behavior, so run the eval set on
// every fallback before trusting it, and record which provider answered each request.
const SHOULD_FALL_BACK = (status) => status === undefined || status === 429 || status >= 500;

async function withDeadline(call, prompt, timeoutMs) {
  const controller = new AbortController();
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      const error = new Error(`No reply within ${timeoutMs} ms`);
      error.name = "TimeoutError";
      reject(error);
    }, timeoutMs);
  });
  try {
    return await Promise.race([call(prompt, { signal: controller.signal }), deadline]);
  } finally {
    clearTimeout(timer);
  }
}

async function generate(providers, prompt, { timeoutMs }) {
  const attempts = [];
  for (const provider of providers) {
    let reply;
    try {
      reply = await withDeadline(provider.call, prompt, timeoutMs);
    } catch (error) {
      if (error.name === "TimeoutError") { attempts.push({ provider: provider.name, outcome: "timeout" }); continue; }
      if (!SHOULD_FALL_BACK(error.status)) throw error;
      attempts.push({ provider: provider.name, outcome: error.status === undefined ? "network" : `status ${error.status}` });
      continue;
    }
    if (reply.finishReason === "content_filter") return { ok: false, reason: "content_filter", provider: provider.name };
    if (!reply.text || !reply.text.trim()) { attempts.push({ provider: provider.name, outcome: "empty" }); continue; }
    attempts.push({ provider: provider.name, outcome: "ok" });
    return { ok: true, text: reply.text, provider: provider.name, attempts };
  }
  const error = new Error(`All ${providers.length} providers failed`);
  error.name = "AllProvidersFailed";
  error.attempts = attempts;
  throw error;
}

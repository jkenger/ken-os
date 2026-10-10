// A function runs to completion: while the stack is busy, no timer, click or render can run. Doing one chunk, then
// waiting on a 0 ms timer, ends the current task, so anything already queued gets its turn before the next chunk.
async function processInChunks(items, handle, chunkSize = 100) {
  const results = [];
  for (let start = 0; start < items.length; start += chunkSize) {
    for (const item of items.slice(start, start + chunkSize)) results.push(handle(item));
    if (start + chunkSize < items.length) await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return results;
}

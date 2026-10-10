async function processInChunks(items, handle, chunkSize = 100) {
  return items.map(handle);
}

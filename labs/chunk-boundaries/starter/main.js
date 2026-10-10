function chunkDocument(text, { maxChars = 400, overlap = 1 } = {}) {
  const chunks = [];
  for (let start = 0; start < text.length; start += maxChars) {
    chunks.push({ heading: "", text: text.slice(start, start + maxChars).trim(), index: chunks.length });
  }
  return chunks;
}

// Retrieval can only return what a chunk holds. Cutting at a character count breaks sentences and glues unrelated
// sections together, so a match brings back half an answer. Sections first, then whole sentences, keeps every chunk
// meaningful on its own; the heading tells the model, and the reader, where it came from; and one overlapping
// sentence keeps a fact that sits on a boundary findable from either side.
function chunkDocument(text, { maxChars = 400, overlap = 1 } = {}) {
  const sections = [];
  let current = { heading: "", lines: [] };
  for (const line of text.split("\n")) {
    const heading = /^#{1,6}\s+(.*)$/.exec(line.trim());
    if (heading) {
      if (current.lines.join(" ").trim()) sections.push(current);
      current = { heading: heading[1].trim(), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.join(" ").trim()) sections.push(current);

  const chunks = [];
  for (const section of sections) {
    const sentences = section.lines
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
      .split(/(?<=[.!?])\s+/)
      .filter(Boolean);
    let start = 0;
    while (start < sentences.length) {
      let end = start + 1;
      while (end < sentences.length && sentences.slice(start, end + 1).join(" ").length <= maxChars) end += 1;
      chunks.push({ heading: section.heading, text: sentences.slice(start, end).join(" "), index: chunks.length });
      if (end >= sentences.length) break;
      start = Math.max(end - overlap, start + 1);
    }
  }
  return chunks;
}

import { Fragment, type ReactNode } from "react";

// A deliberately small Markdown renderer for AI-written lesson text: paragraphs, lists, code blocks, inline code,
// bold and italics. It builds React elements only, so model output can never inject HTML.

function inline(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g;
  let last = 0;
  let index = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index! > last) parts.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${index++}`;
    if (token.startsWith("`")) parts.push(<code key={key} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{token.slice(1, -1)}</code>);
    else if (token.startsWith("**")) parts.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    else parts.push(<em key={key}>{token.slice(1, -1)}</em>);
    last = match.index! + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function CodeBlock({ code }: { code: string }) {
  return <pre className="overflow-x-auto rounded-lg border border-border bg-muted/60 p-4 font-mono text-[13px] leading-5"><code>{code.replace(/\n$/, "")}</code></pre>;
}

export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (line.startsWith("```")) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) code.push(lines[index++]);
      index += 1;
      blocks.push(<CodeBlock key={blocks.length} code={code.join("\n")} />);
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (index < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[index])) items.push(lines[index++].replace(/^\s*([-*]|\d+\.)\s+/, ""));
      const List = ordered ? "ol" : "ul";
      blocks.push(<List key={blocks.length} className={`${ordered ? "list-decimal" : "list-disc"} space-y-1 pl-5`}>{items.map((item, itemIndex) => <li key={itemIndex}>{inline(item, `${blocks.length}-${itemIndex}`)}</li>)}</List>);
      continue;
    }
    if (/^#{1,4}\s/.test(line)) {
      blocks.push(<p key={blocks.length} className="font-semibold">{inline(line.replace(/^#+\s/, ""), `${blocks.length}`)}</p>);
      index += 1;
      continue;
    }
    if (!line.trim()) { index += 1; continue; }
    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim() && !lines[index].startsWith("```") && !/^\s*([-*]|\d+\.)\s+/.test(lines[index]) && !/^#{1,4}\s/.test(lines[index])) paragraph.push(lines[index++]);
    blocks.push(<p key={blocks.length}>{inline(paragraph.join(" "), `${blocks.length}`)}</p>);
  }
  return <div className="space-y-3 text-[15px] leading-6">{blocks.map((block, blockIndex) => <Fragment key={blockIndex}>{block}</Fragment>)}</div>;
}

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Fragment, type ReactNode } from "react";
import { CodeEditor } from "@/components/ui/code-editor";

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

export function CodeBlock({ code, label = "Code" }: { code: string; label?: string }) {
  return <CodeEditor value={code.replace(/\n$/, "")} readOnly label={label} />;
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
    if (line.trim().startsWith("|")) {
      const rows: string[][] = [];
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        const cells = lines[index++].trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
        if (!cells.every((cell) => /^:?-{2,}:?$/.test(cell))) rows.push(cells);
      }
      const [head, ...body] = rows;
      const key = blocks.length;
      blocks.push(
        <div key={key} className="overflow-x-auto">
          <Table className="w-full border-collapse text-left text-sm">
            <TableHeader><TableRow>{head.map((cell, cellIndex) => <TableHead key={cellIndex} className="border-b border-border px-3 py-2 font-semibold">{inline(cell, `${key}-h${cellIndex}`)}</TableHead>)}</TableRow></TableHeader>
            <TableBody>{body.map((row, rowIndex) => <TableRow key={rowIndex}>{row.map((cell, cellIndex) => <TableCell key={cellIndex} className="border-b border-border px-3 py-2 align-top">{inline(cell, `${key}-${rowIndex}-${cellIndex}`)}</TableCell>)}</TableRow>)}</TableBody>
          </Table>
        </div>,
      );
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
    while (index < lines.length && lines[index].trim() && !lines[index].trim().startsWith("|") && !lines[index].startsWith("```") && !/^\s*([-*]|\d+\.)\s+/.test(lines[index]) && !/^#{1,4}\s/.test(lines[index])) paragraph.push(lines[index++]);
    blocks.push(<p key={blocks.length}>{inline(paragraph.join(" "), `${blocks.length}`)}</p>);
  }
  return <div className="space-y-3 text-sm leading-6">{blocks.map((block, blockIndex) => <Fragment key={blockIndex}>{block}</Fragment>)}</div>;
}

/**
 * A middle dot between two short pieces of inline text ("Acme Inc · Remote"). A literal
 * " · " relies on the space character's width to center the glyph, which reads unevenly in
 * most fonts; this gives it an even margin on both sides instead. Unlike InlineSeparator
 * (a vertical rule for a row of items), this sits inside one line of text.
 */
export function DotSeparator() {
  return <span className="mx-1.5">&middot;</span>;
}

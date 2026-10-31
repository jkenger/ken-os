/**
 * A dot between two short pieces of inline text ("Acme Inc · Remote"). A rendered circle
 * instead of a literal "·" character, so its size and position don't depend on a font's own
 * glyph metrics. Unlike InlineSeparator (a vertical rule for a row of items), this sits inside
 * one line of text. Uses `inline-flex`, not `inline-block`: this project's `--spacing-block`
 * token collides with Tailwind's built-in `inline-block` utility and silently adds a width.
 */
export function DotSeparator() {
  return <span className="mx-2 inline-flex size-[3px] shrink-0 rounded-full bg-muted-foreground/60 align-middle" />;
}

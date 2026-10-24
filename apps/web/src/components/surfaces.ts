// Shared surface classes for every Loots module (docs/architecture/design-system.md). Class strings, so they compose
// with cn() at the call site; anything with behaviour belongs in a component instead.

/** A panel or card: a bordered card surface, no shadow. */
export const panel = "rounded-lg bg-card border";

/** A selected card or button that has its own border: a soft border and ring in the selected colour on a card surface. */
export const selectedSurface = "border-selected/70 bg-card ring-1 ring-selected/40 hover:bg-card";

/** A picked row inside a list with no border of its own: a muted fill and a 2px edge in the selected colour on the
 *  left, so it never looks like the keyboard focus ring, which outlines the whole row. */
export const selectedInset = "bg-muted shadow-[inset_2px_0_0_var(--selected)] hover:bg-muted";

/** A selected row inside a divided `panel` list, where the row has no border of its own: the same colour as an inset
 *  outline, rounded at the list's ends to follow the panel's corners. Full strength, because the outline is the only
 *  visual cue: it clears 3:1 against the card (7.7:1; selected is the console blue). */
export const selectedRow = "bg-card ring-1 ring-selected ring-inset first:rounded-t-lg last:rounded-b-lg";

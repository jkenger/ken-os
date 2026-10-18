// Shared surface classes for every Loots module (docs/architecture/design-system.md). Class strings, so they compose
// with cn() at the call site; anything with behaviour belongs in a component instead.

/** A panel or card: a bordered card surface, no shadow. */
export const panel = "rounded-xl bg-card border";

/** A selected card or button that has its own border: a soft border and ring in the selected colour on a card surface. */
export const selectedSurface = "border-selected/55 bg-card ring-3 ring-selected/15 hover:bg-card";

/** A selected row inside a divided `panel` list, where the row has no border of its own: the same colour as an inset
 *  outline, rounded at the list's ends to follow the panel's corners. */
export const selectedRow = "bg-card ring-1 ring-selected/55 ring-inset first:rounded-t-xl last:rounded-b-xl";

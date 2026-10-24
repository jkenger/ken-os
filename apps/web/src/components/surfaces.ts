// Shared surface classes for every Loots module (docs/architecture/design-system.md). Class strings, so they compose
// with cn() at the call site; anything with behaviour belongs in a component instead.

/** A panel or card: a bordered card surface, no shadow. */
export const panel = "rounded-xl bg-card border";

/** A selected card or button that has its own border: a soft border and ring in the selected colour on a card surface. */
export const selectedSurface = "border-selected/55 bg-card ring-3 ring-selected/15 hover:bg-card";

/** A selected row inside a divided `panel` list, where the row has no border of its own: the same colour as an inset
 *  outline, rounded at the list's ends to follow the panel's corners. Full strength, because the outline is the only
 *  visual cue: it clears 3:1 against the card (19.8:1 light, 16.9:1 dark; selected is the text ink since 24 Oct 2026). */
export const selectedRow = "bg-card ring-1 ring-selected ring-inset first:rounded-t-xl last:rounded-b-xl";

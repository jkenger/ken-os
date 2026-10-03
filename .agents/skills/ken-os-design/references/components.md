# Components — repeated surfaces and actions

Version: 0.1.0-working.6 · working / not yet approved. Adapt anatomy to the target product rather than copying Ken OS content.

## Component reuse

Define components by shared anatomy and behavior, not by the module that first uses them. Compose reusable primitives with slots or variants across modules. Create a module-specific component only when it owns genuinely distinct interaction, state, accessibility, or data behavior; different copy or sample content alone is not a reason to duplicate the component.

## Buttons

One filled primary action per task area; outline and quiet actions recede. Warm-charcoal fill, 10px radius and 14px semibold label. An end icon gets a fine divider only when it reinforces the action.

## Cards

Use the stock shadcn Card surface and standard slots across modules; do not create module-named copies or nested cards. Keep the established Ken OS density and typography: 16px compact spacing, 16px semibold titles, 14px supporting text, 13px source metadata, and 8px between repeated cards. Compose CardHeader, CardTitle, CardDescription, CardAction, CardContent and CardFooter as needed. Status must be readable as text, not color alone. Custom surface styling remains an open decision.

## Feature panels

Use the same Card or a plain section for task surfaces. Give roomier task surfaces 24–28px spacing and 15–16px explanatory copy. Do not add a module-specific Card component merely for different content.

## Inputs

Quiet boundary, clear label and obvious focus. Use 40–44px height, 14px text, warm border and visible focus ring; retain error and disabled states.

## App shell

Navigation is persistent only when there are real sibling destinations. A floating 264–280px desktop rail and separate inset main surface; mobile uses an accessible menu. Dividers reach the content frame while text stays padded.

## Density check

Before shrinking type, remove redundant wrappers, oversized padding, and repeated labels. Let consequential copy wrap. Inspect desktop and mobile with realistic long titles, errors, focus, and disabled states. Status must be legible as text, not color alone. Do not nest cards or turn every section into a card.

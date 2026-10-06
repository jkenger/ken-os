# Components: repeated surfaces and actions

Version: 0.3.0-working.1 · working / not yet approved. Adapt anatomy to the target product rather than copying Ken OS content.

## Component reuse

Define components by shared anatomy and behavior, not by the module that first uses them. Compose reusable primitives with slots or variants across modules. Create a module-specific component only when it owns genuinely distinct interaction, state, accessibility, or data behavior; different copy or sample content alone is not a reason to duplicate the component.

## Buttons

One filled charcoal action per task area; secondary actions sit on the canvas with a hairline, text actions underline on hover. 44px high, 5px radius, 14px medium label, 19px side padding, an arrow end icon 14px from the label. Hover darkens the fill; buttons never fade.

## Panels and cards

Panels on the canvas with a 1px hairline and 5px radius; no shadows, no nested panels. Header strips use the table-head surface with a 12px semibold quiet label. Tables are panels whose rows open into a tinted detail block. Status must be readable as text, not colour alone.

## Page heading

Eyebrow, large title, an optional badge, and facts on the right. No tagline under the title: screens name things, they don't describe themselves. Facts are a 12px label over a 15px semibold value.

## Rails

Junior, mid and senior (or any short ordered scale) as three 12px rounded segments with labels underneath. Light up the reached segment in charcoal, use stone for an estimate, and always write the value in words beside the rail. Coverage is a segment per requirement and a count, never a percentage.

## Inputs

Canvas field, warm hairline, clear label and an obvious focus ring. Use 40–44px height, 14px text, the warm input edge and the warm focus ring; retain error and disabled states.

## Notifications

Call toast() after something finishes in the background or saves; keep errors next to the action that failed. One shared Toaster in the workspace shell: bottom right on desktop, full width on a phone, at most three, newest last. Success and info leave after six seconds, pausing while hovered or focused; errors stay until dismissed. Each has a title, an optional one-line description and at most one action (a button or a Ken OS link). Colour comes from the status tokens and is always paired with an icon and words.

## App shell

A tinted 232px rail with the modules and the current module's sections, and a 59px header with a breadcrumb. The rail (205px under 1280px) has the brand, the modules with 21px outline icons, and the owner at the bottom, with no divider against the canvas. The current module is a warm stone fill. Below the modules, a small label names the current module and lists its sections; the current section uses the same fill. The header shows 'Ken OS / Module' on the left and search and sign out on the right. Mobile uses an accessible menu holding both lists.

## Density check

Before shrinking type, remove redundant wrappers, oversized padding, and repeated labels. Let consequential copy wrap. Inspect desktop and mobile with realistic long titles, errors, focus, and disabled states. Status must be legible as text, not color alone. Do not nest cards or turn every section into a card.

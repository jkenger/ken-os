# Components: repeated surfaces and actions

Version: 0.4.0-working.1 · working / not yet approved. Adapt anatomy to the target product rather than copying Ken OS content.

## Component reuse

Define components by shared anatomy and behavior, not by the module that first uses them. Compose reusable primitives with slots or variants across modules. Create a module-specific component only when it owns genuinely distinct interaction, state, accessibility, or data behavior; different copy or sample content alone is not a reason to duplicate the component.

## Buttons

One filled ink action per task area; secondary actions are white with a visible edge; text actions underline on hover. 44px high and fully round, 14px medium label, 20px side padding, an optional arrow 10px after the label. Hover changes the fill; buttons never fade.

## Panels and cards

White panels raised off the stone ground: 14px corners and a soft shadow, no outline, no nested panels. The title and an optional count sit inside the panel. Rows are split by a hairline and open into a tinted detail block. Status must be readable as text, not colour alone.

## Page heading

Eyebrow, large title, an optional badge and description, and facts on the right. The description is one line on what the page holds, never a tagline. Facts are a 12px label beside a 15px semibold value.

## Rails

Junior, mid and senior (or any short ordered scale) as three round segments with labels underneath. Light up the reached segment in cobalt, use light cobalt for an estimate, and always write the value in words beside the rail. Coverage is a segment per requirement and a count, never a percentage.

## Inputs

White field, visible edge, clear label and a cobalt focus ring. Use 40px height, 10px corners, 14px text and the input edge (3.4:1); retain error and disabled states.

## Notifications

Call toast() after something finishes in the background or saves; keep errors next to the action that failed. One shared Toaster in the workspace shell: bottom right on desktop, full width on a phone, at most three, newest last. Success and info leave after six seconds, pausing while hovered or focused; errors stay until dismissed. Each has a title, an optional one-line description and at most one action (a button or a Ken OS link). Colour comes from the status tokens and is always paired with an icon and words.

## App shell

shadcn's sidebar anatomy: a 48px icon rail and a 208px section column on the stone sidebar, split by a hairline, beside one raised content inset. Rail and column use shadcn's menu sizes: 32px buttons with 8px padding, 16px icons, 14px labels and 6px corners; the current module and section are white with the tab shadow and medium weight. The rail holds a 32px brand square, module icons with right-side tooltips, and the owner's initials. The inset sits 8px from the window with 14px corners and the panel shadow; its 56px header, with a hairline under it, carries a toggle for the section column (Ctrl or Cmd + B, remembered in a cookie), a divider, a 'Module › Section' breadcrumb, the date, search and sign out. Under 1024px, or when the column is hidden, sections become tabs under the header. Under 768px the inset drops away and an 18rem menu holds both lists.

## Density check

Before shrinking type, remove redundant wrappers, oversized padding, and repeated labels. Let consequential copy wrap. Inspect desktop and mobile with realistic long titles, errors, focus, and disabled states. Status must be legible as text, not color alone. Do not nest cards or turn every section into a card.

---
name: ken-os-design
description: Apply the owner's working Ken OS-derived visual baseline to a personal web app when requested. Covers shell, warm monochrome typography, stock shadcn cards, and primary actions; not for unrelated UI work.
---

# Ken OS design baseline

Version: 0.1.0-working.5. Status: **working / not yet approved**. This is an optional visual preset, not a project scaffold. The user's explicit choices and the target project's existing design system take precedence.

## Apply it

1. Identify the target product, primary screen, user outcome, and existing UI stack. If asked only to discuss design, do not edit code.
2. Read [foundations](references/foundations.md) for palette, typography, and shell; read [components](references/components.md) for repeated surfaces and actions.
3. If the stack is undecided, prefer Tailwind CSS and tailored shadcn/ui primitives. Otherwise translate the visual rules without installing a new framework. Settle one representative screen before rolling out more.
4. Check realistic content, desktop/mobile layout, keyboard focus, disabled/loading states, and the main action in the rendered app.

## Boundaries

The light palette is intentional. Card styling remains open: use stock shadcn Card until the owner settles a custom treatment. Do not add green or blue accents, decorative corner brackets, cut edges, or heavy shadows without a new owner decision. Do not copy Ken OS branding, module names, sample data, or navigation into another product. Do not install globally, alter unrelated dependencies, deploy, or publish solely because this skill is invoked.

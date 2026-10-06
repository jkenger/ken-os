---
name: ken-os-design
description: Apply the owner's working Ken OS-derived visual baseline to a personal web app when requested. Covers the flat-ground shell, Bricolage Grotesque and Public Sans typography, raised white panels on stone, rails, round controls and the single cobalt signal; not for unrelated UI work.
---

# Ken OS design baseline

Version: 0.4.0-working.1. Status: **working / not yet approved**. This is an optional visual preset, not a project scaffold. The user's explicit choices and the target project's existing design system take precedence.

## Apply it

1. Identify the target product, primary screen, user outcome, and existing UI stack. If asked only to discuss design, do not edit code.
2. Read [foundations](references/foundations.md) for palette, typography, and shell; read [components](references/components.md) for repeated surfaces and actions.
3. If the stack is undecided, prefer Tailwind CSS and tailored shadcn/ui primitives. Otherwise translate the visual rules without installing a new framework. Settle one representative screen before rolling out more.
4. Check realistic content, desktop/mobile layout, keyboard focus, disabled/loading states, and the main action in the rendered app.

## Boundaries

The stone ground, white panels and ink are intentional; colour is used only for meaning (status) and the one cobalt signal (focus, rail level, selection). Panels are white with 14px corners and a soft shadow, never an outline. Do not add gradients, glass effects, further accent colours, decorative corner brackets, cut edges, heavy shadows or tagline paragraphs without a new owner decision. Do not copy Ken OS branding, module names, sample data, or navigation into another product. Do not install globally, alter unrelated dependencies, deploy, or publish solely because this skill is invoked.

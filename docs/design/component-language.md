# Ken OS component language

Status: working visual baseline, pending owner review of the Design System gallery. The versioned [design contract](../../apps/web/src/features/design-system/contract.ts) owns token values and usage guidance. The [Ken OS design skill](../../.agents/skills/ken-os-design/SKILL.md) and its references are generated portable snapshots, not an independently edited specification.

The current implementation uses Tailwind utilities, tailored shadcn Button and Input primitives, and the stock shadcn Card in `apps/web/src/components/ui`. The owner-only Design System gallery renders those real primitives; Project Memory decisions, Skills entries, and Resume hub actions remain the proving surfaces.

The owner selected the soft-document primary button and Ken OS's light palette. Card surface styling is deferred: use shadcn's default Card and standard slots while retaining Ken OS's established typography and density (compact repeated items; roomier task panels). The earlier custom card surface is not part of the baseline. Project Memory must not have a separate `MemoryCard`. Do not copy Ken OS branding or sample module content into a new project merely because it uses the skill.

The ambient light card (an ivory-to-stone gradient) is a surface exploration in the gallery, not a token. It can become a named surface token after the owner reviews it there.

Components are shared by default across modules. Compose them with slots or variants; introduce a module-specific component only when it has genuinely distinct behavior, state, accessibility, or data responsibilities—not merely different text or a different destination.

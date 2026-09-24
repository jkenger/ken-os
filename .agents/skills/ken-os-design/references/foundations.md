# Foundations — Ken OS visual system

Version: 0.1.0-working.5 · working / not yet approved. These are portable defaults, not a requirement to reproduce Ken OS.

## Palette

| Role | Value | Use |
| --- | --- | --- |
| Canvas | `#fffefb` | Main canvas and quiet cards |
| Ink | `#242321` | Primary text |
| Primary | `#292824` | Main action and strongest emphasis |
| On primary | `#fffefb` | Text on the primary action |
| Soft surface | `#f4f1eb` | Subtle section separation |
| Secondary surface | `#edeae4` | Quiet controls and selected navigation |
| Muted ink | `#766f66` | Supporting copy and metadata |
| Hairline | `#ddd9d2` | Section dividers and card outlines |
| Input edge | `#d5d0c8` | Form-control boundary |
| Focus | `#726a5e` | Visible keyboard focus |
| Destructive | `#bd3434` | Destructive actions and error emphasis |

Keep normal-size text readable; do not lower opacity just to seem understated.

## Typography

Use Manrope for display headings and card titles; Source Sans 3 for body and controls. Retain the established Ken OS type scale even while the Card surface stays stock shadcn. If fonts are unavailable, choose readable local fallbacks and verify rendering.

| Role | Desktop | Mobile | Treatment |
| --- | --- | --- | --- |
| Page title | 48px | 36px | Manrope, bold, tight tracking |
| Introduction | 16–18px | 16px | Source Sans 3, comfortable line height |
| Feature title | 18px | 18px | Manrope, semibold |
| Card title | 16px / 20px | 16px / 20px | Manrope, semibold; keep Ken OS's compact text hierarchy |
| Body | 14px / 20px | 14px / 20px | Source Sans 3 |
| Metadata | 13px / 18–20px | 13px / 18–20px | Source Sans 3 |
| Eyebrow / status | 11px | 11px | Bold, tracked, never color-only |

Long explanations can use 15–16px with a 22–24px line height. Avoid display type for dense body text.

## Composition

Use an ivory canvas, precise hierarchy, whitespace, and thin full-width section dividers. Text stays padded inside the content frame. A floating desktop sidebar around 264–280px works only when the product has real sibling destinations; use an accessible mobile menu instead of squeezing the rail. Main content may be bounded near 1320px, with about 20px mobile, 32px medium, and 40px desktop horizontal padding. Keep one clear page title and reserve the filled primary action for the main task.

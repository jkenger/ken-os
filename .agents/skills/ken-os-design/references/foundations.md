# Foundations: Ken OS visual system

Version: 0.3.0-working.1 · working / not yet approved. These are portable defaults, not a requirement to reproduce Ken OS.

## Palette

| Role | Value | Use |
| --- | --- | --- |
| Canvas | `#fffefb` | Main canvas, header and page background |
| Ink | `#242321` | Primary text and titles |
| Panel | `#fffefb` | Panels, tables, cards and inputs; separated by a hairline, not a fill |
| Primary | `#292824` | The one main action and the strongest emphasis |
| Primary hover | `#11100e` | Hover on the main action |
| On primary | `#fffefb` | Text on the primary action |
| Soft surface | `#f4f1eb` | Quiet fills and neutral status labels |
| Secondary surface | `#edeae4` | Badges, segmented controls and quiet controls |
| Secondary ink | `#242321` | Text on secondary buttons |
| Muted ink | `#6e675e` | Supporting copy and metadata; at least 4.5:1 on every Ken OS surface |
| Quiet ink | `#5b554d` | Badge text and table headings |
| Hover surface | `#f4f1eb` | Hover on secondary buttons and menu items |
| Hairline | `#ddd9d2` | Panel outlines, table rows and section dividers |
| Input edge | `#d5d0c8` | Form-control and secondary-button boundary |
| Focus | `#726a5e` | Visible keyboard focus |
| Destructive | `#bd3434` | Destructive actions and error emphasis |
| Sidebar | `#f6f3ed` | The module rail, edge to edge, no divider |
| Sidebar ink | `#4a4540` | Module and section names in the rail |
| Selected item | `#edeae4` | Background of the current module and section |
| Selected item ink | `#242321` | Text of the current module and section |
| Tint | `#f7f4ee` | Expanded detail inside a table, such as remaining requirements |
| Table head | `#f9f7f2` | Table and panel header strips |
| Row hover | `#faf8f3` | Hover on table and list rows |
| Rail track | `#e6e1d8` | Unlit segments of level and coverage rails |
| Rail level | `#292824` | The reached level on a rail, in charcoal; the words always say it too |
| Rail soft | `#b5ada1` | Estimates and coverage on a rail, in stone |
| Solid status | `#2d6a45` | Text for solid, proven or passing; always paired with words |
| Solid tint | `#e5efe7` | Background behind solid status text |
| Partial status | `#7a5710` | Text for partly there, in progress or close |
| Partial tint | `#f5ecd6` | Background behind partial status text |
| Gap status | `#9a2f2b` | Text for gaps, misconceptions or failures |
| Gap tint | `#f6e2df` | Background behind gap status text |

Keep normal-size text readable; do not lower opacity just to seem understated.

## Typography

Use Manrope for page, section and card titles, and Source Sans 3 for body, controls and metadata. Page titles are Manrope 750; section titles bold; card titles semibold. If the fonts are unavailable, choose readable local fallbacks and verify rendering.

| Role | Desktop | Mobile | Treatment |
| --- | --- | --- | --- |
| Eyebrow | 11px | 11px | Source Sans 3 semibold, uppercase, 0.06em tracking; only when it adds context |
| Page title | 36px | 28px | Manrope 750, -1.3px tracking (30px between 768 and 1280px) |
| Section title | 25px / 30px | 23px | Manrope bold, -0.6px; 30px for the one dominant panel |
| Card title | 15–17px | 14–15px | Manrope semibold |
| Body | 14px | 14px | Source Sans 3 regular, 1.55 line height |
| Metadata | 12–13px | 11–12px | Source Sans 3, muted ink |
| Badge / rail label | 11px / 10px | 11px / 9px | Never colour-only |

Long explanations can use 15–16px with a 22–24px line height. Avoid display type for dense body text.

## Composition

Use an ivory canvas, hairline panels, and one charcoal action. A tinted 232px module rail (205px under 1280px) sits flush against the canvas with no divider, only when the product has real sibling destinations; the current module's sections sit below the modules, and a 59px header carries a breadcrumb. Use an accessible mobile menu instead of squeezing the rail. Content is bounded near 1500px with about 12px mobile and 20px desktop padding. Pages open with an eyebrow, a large title, an optional badge and facts on the right; one dominant panel holds the main action.

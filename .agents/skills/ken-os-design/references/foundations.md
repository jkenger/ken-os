# Foundations: Ken OS visual system

Version: 0.2.0-working.1 · working / not yet approved. These are portable defaults, not a requirement to reproduce Ken OS.

## Palette

| Role | Value | Use |
| --- | --- | --- |
| Canvas | `#fbfcfe` | Main canvas, header and page background |
| Ink | `#101827` | Primary text and titles |
| Panel | `#ffffff` | Panels, tables, cards and inputs on the canvas |
| Primary | `#173fdf` | The one main action, selected tab underline and links |
| Primary hover | `#1034c4` | Hover on the main action |
| On primary | `#ffffff` | Text on the primary action |
| Soft surface | `#f2f5f9` | Quiet fills and neutral status labels |
| Secondary surface | `#ebeff5` | Badges, segmented controls and quiet controls |
| Secondary ink | `#33425c` | Text on secondary buttons |
| Muted ink | `#5f6a80` | Supporting copy and metadata; at least 4.5:1 on every Ken OS surface |
| Quiet ink | `#526078` | Badge text and table headings |
| Hover surface | `#f5f8fe` | Hover on secondary buttons and menu items |
| Hairline | `#e0e5ed` | Panel outlines, table rows and section dividers |
| Input edge | `#ced6e2` | Form-control boundary |
| Focus | `#86a9ff` | Visible keyboard focus |
| Destructive | `#bd3434` | Destructive actions and error emphasis |
| Sidebar | `#f2f5f9` | The module rail, edge to edge, no divider |
| Sidebar ink | `#4e5b70` | Module names in the rail |
| Selected module | `#e4edff` | Background of the current module in the rail |
| Selected module ink | `#1240db` | Text of the current module and the selected tab |
| Tint | `#f2f6fd` | Expanded detail inside a table, such as remaining requirements |
| Table head | `#f7f9fc` | Table and panel header strips |
| Row hover | `#f9fbff` | Hover on table and list rows |
| Rail track | `#e2e5eb` | Unlit segments of level and coverage rails |
| Rail level | `#6599fa` | The reached level on a rail; the words always say it too |
| Rail soft | `#a3c6ff` | Estimates and coverage on a rail |
| Solid status | `#276345` | Text for solid, proven or passing; always paired with words |
| Solid tint | `#eff8f4` | Background behind solid status text |
| Partial status | `#7a5710` | Text for partly there, in progress or close |
| Partial tint | `#f5ecd6` | Background behind partial status text |
| Gap status | `#823e2f` | Text for gaps, misconceptions or failures |
| Gap tint | `#fff4f1` | Background behind gap status text |

Keep normal-size text readable; do not lower opacity just to seem understated.

## Typography

Use Inter for everything, with the system UI stack as fallback. Weight carries hierarchy: 750 for page titles, 600–700 for section and card titles, 500 for buttons and table cells, 400 for body. Verify rendering if Inter can't load.

| Role | Desktop | Mobile | Treatment |
| --- | --- | --- | --- |
| Eyebrow | 11px | 11px | Inter medium, uppercase, 0.06em tracking; only when it adds context |
| Page title | 36px | 28px | Inter 750, -1.3px tracking (30px between 768 and 1280px) |
| Section title | 25px / 30px | 23px | Inter bold, -0.6px; 30px for the one dominant panel |
| Card title | 15–17px | 14–15px | Inter semibold |
| Body | 14px | 14px | Inter regular, 1.55 line height |
| Metadata | 12–13px | 11–12px | Inter, muted ink |
| Badge / rail label | 11px / 10px | 11px / 9px | Never colour-only |

Long explanations can use 15–16px with a 22–24px line height. Avoid display type for dense body text.

## Composition

Use a near-white cool canvas, white hairline panels, and one indigo action. A tinted 232px module rail (205px under 1280px) sits flush against the canvas with no divider, only when the product has real sibling destinations; the current module's sections sit below the modules, and a 59px header carries a breadcrumb. Use an accessible mobile menu instead of squeezing the rail. Content is bounded near 1500px with about 12px mobile and 20px desktop padding. Pages open with an eyebrow, a large title, an optional badge and facts on the right; one dominant panel holds the main action.

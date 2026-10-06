# Foundations: Ken OS visual system

Version: 0.4.0-working.1 · working / not yet approved. These are portable defaults, not a requirement to reproduce Ken OS.

## Palette

| Role | Value | Use |
| --- | --- | --- |
| Ground | `#f3f2ee` | Stone behind the icon rail and section column, framing the raised content inset |
| Ink | `#1a1a17` | Primary text and titles |
| Canvas | `#fcfcfa` | The raised content surface from 768px up, inset 8px from the window with the top nav as its header; panels on it are white with a shadow |
| Panel | `#ffffff` | Panels, inputs, toasts and the current rail item; raised off the ground by a shadow, never outlined |
| Primary | `#1a1a17` | The one main action per task area |
| Primary hover | `#3a3933` | Hover on the main action; lightens because primary is already near black |
| On primary | `#ffffff` | Text on the primary action |
| Soft fill | `#f3f2ee` | Quiet fills inside a white panel and neutral status labels |
| Secondary surface | `#ecebe6` | Badges, segmented controls and quiet controls |
| Secondary ink | `#1a1a17` | Text on secondary buttons |
| Muted ink | `#62605a` | Supporting copy and metadata; 5.3:1 or better on every Ken OS surface |
| Quiet ink | `#4f4d47` | Badge text, labels and table headings |
| Hover surface | `#ecebe6` | Hover on the ground, secondary buttons and menu items |
| Hairline | `#e6e4de` | Lines between rows inside a panel; panels themselves have no outline |
| Input edge | `#8e8b83` | Form-control and secondary-button edge; 3.4:1 on white and 3.0:1 on the ground |
| Focus | `#2747c9` | Visible keyboard focus, in the cobalt signal |
| Signal | `#2747c9` | The one accent, cobalt: focus, the reached level on a rail and selected controls; never decoration |
| Destructive | `#c0362c` | Destructive actions and error emphasis, in coral |
| Rail | `#f3f2ee` | The icon rail and section column, one stone surface split by a hairline |
| Rail ink | `#4f4d47` | Module icons and section names |
| Current item | `#ffffff` | The current module tile and section tab, white with a small shadow |
| Current item ink | `#1a1a17` | Text of the current module and section |
| Tint | `#f7f6f2` | Expanded detail inside a table, such as remaining requirements |
| Table head | `#fafaf8` | Column headings of a table inside a panel |
| Row hover | `#faf9f6` | Hover on table and list rows |
| Rail track | `#e6e4de` | Unlit segments of level and coverage rails |
| Rail level | `#2747c9` | The reached level on a rail, in cobalt; the words always say it too |
| Rail soft | `#8fa0e3` | Estimates and coverage on a rail, light cobalt |
| Solid status | `#0f766e` | Teal text for solid, proven or passing; always paired with words |
| Solid tint | `#e6f4f2` | Background behind solid status text |
| Partial status | `#9a5b00` | Amber text for partly there, in progress or close |
| Partial tint | `#fff4e0` | Background behind partial status text |
| Gap status | `#c0362c` | Coral text for gaps, misconceptions or failures |
| Gap tint | `#fdeeec` | Background behind gap status text |

Keep normal-size text readable; do not lower opacity just to seem understated.

## Typography

Use Bricolage Grotesque for page, section and card titles, and Public Sans for body, controls and metadata. Page titles are Bricolage Grotesque 750; section titles bold; card titles semibold. If the fonts are unavailable, choose readable local fallbacks and verify rendering.

| Role | Desktop | Mobile | Treatment |
| --- | --- | --- | --- |
| Eyebrow | 11px | 11px | Public Sans semibold, uppercase, 0.08em tracking; only when it adds context |
| Page title | 40px | 30px | Bricolage Grotesque 750, -0.035em tracking (34px between 768 and 1280px) |
| Section title | 24px / 30px | 21px | Bricolage Grotesque bold, -0.025em; 30px for the one dominant panel |
| Card title | 15–17px | 14–15px | Bricolage Grotesque semibold |
| Body | 14px | 14px | Public Sans regular, 1.5 line height |
| Metadata | 12–13px | 11–12px | Public Sans, muted ink |
| Badge / rail label | 12px / 11px | 12px / 10px | Never colour-only |

Long explanations can use 15–16px with a 22–24px line height. Avoid display type for dense body text.

## Composition

Use one flat stone ground, raised white panels, and one ink action. When the product has real sibling destinations, a 64px module icon strip and a 208px section column share the ground with the page, with no dividers; the current module and section are white tabs, and a 56px header carries a "Module / Section" breadcrumb. Under 1024px the sections become tabs above the page; on a phone use an accessible menu. Content is bounded near 1500px with about 12px mobile and 20px desktop padding. Pages open with an eyebrow, a large title, an optional badge and facts on the right; one dominant panel holds the main action.

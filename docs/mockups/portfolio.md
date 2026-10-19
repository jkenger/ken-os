# Portfolio: mockup brief

Status: proposed, 19 Oct 2026. The UI half of [portfolio.md](../architecture/portfolio.md), which holds the decisions
this brief draws: a private Portfolio module in Loots with one Publish, a public snapshot endpoint, and a separate
`apps/portfolio` site on the owner's own domain that reads only that snapshot. Content is Profile plus Engineering as
learning in public. This brief says which frames, states and words to draw. Code follows the chosen mockups.

There are two surfaces with different rules: **Loots** (the Portfolio module, part A and B) keeps the Loots look, and
**the site** (part C to E) has its own look and is where the creative work goes.

## Handoff: what to return

This brief is written for another agent to draw from. When the mockups are done, hand back all of the following. A
frame that can't be drawn as written still comes back, with a note saying why.

1. **The design canvas link**: one canvas with an artboard per frame, named by its frame id, at the widths in Ground
   rules, plus the dark frames named. The canvas is the reference for building. Do not export or render PNGs; that is
   only for an outside agent that cannot open the canvas, and only when the owner asks.
2. **`portfolio-mockups/README.md`** in project files, with:
   - **Frames**: a table of every frame id, its artboard, and Done, Changed or Skipped.
   - **Changes from this brief**: each place the copy, layout or behaviour differs from what is written here, and why.
   - **Proposals**: any new token or component the Loots frames needed, named as a proposal with what it is for (see
     "Adding a token or component" in `design-system.md`). For the site, the tokens of the chosen direction (type
     scale, colours, spacing) as a short list. None is fine for Loots.
   - **Open questions**: decisions the owner has to make before code starts, each with the option you recommend.
3. **A short summary** in the reply that hands the work back: which frames to look at first, and the open questions.

Do not change code, `globals.css` or this brief. Changes to the brief go under "Changes from this brief"; the owner
folds the agreed ones in.

## Ground rules for every frame

- **Loots frames (A, B):** Loots as it is. shadcn's default setup plus the Loots tokens and shared rules in
  [design-system.md](../architecture/design-system.md): `panel` surfaces with no shadow, status never colour alone,
  the status set (`StatusIcon`, `StatusLabel`) for topic states. Build from `components/ui` (Button, Badge, Card,
  Switch, Alert, Collapsible, Dialog, Tooltip, Skeleton, toaster) inside `WorkspaceShell` with `PageHeading`. Anything
  new is named as a proposal.
- **Site frames (C to E):** its own look. The Loots rules and primitive guards do not apply (`portfolio.md`, "Portfolio
  side"). It may borrow Loots components where they fit. Accessibility still holds: 4.5:1 text in both themes, visible
  focus, status never colour alone, works with the keyboard.
- **Words:** Loots frames use app language: names, actions and states, no sentences, no taglines, no em dashes, no
  emoji. The site is public, like the signed-out page, so its content speaks in sentences (the owner's own summary and
  bullets, Claude's review text), but its navigation, labels and buttons stay short. No em dashes and no emoji anywhere.
  Copy below is final unless a frame shows it doesn't fit.
- **Sizes:** desktop at 1440 and 1280 wide, phone at 390. Tablet at 1024 for the site only. Light theme, plus the dark
  frames named below.
- **Real data:** the owner is John Kenneth Gervacio, "Full-stack engineer", Manila, Philippines, GitHub `jkenger`. His
  real Engineering roadmap (below). Experience, education and project rows come from his saved Profile; if you can't
  read it, draw the rows with bracketed field names (`[Company]`, `[Title]`, `2024-01 to Present`) rather than made-up
  companies. The one real project to draw is Loots itself ("Loots", a private platform where each workflow is a
  module). No lorem ipsum.

### The roadmap to draw

"Full-stack Engineer with applied AI": 41 topics, 3 Learned, 2 In progress, 36 Not started.

| Chapter                    | Area            | Topics and status                                                                                                 |
| -------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------- |
| React                      | Frontend        | State & rendering (Learned), Effects & dependencies (Learned), Component boundaries (Learned)                     |
| Next.js                    | Added by Claude | Server vs client components (In progress), Route handlers & server actions, Streaming model output to the UI      |
| Model interfaces           | Applied AI      | Structured outputs, Tool calling, Runtime validation                                                              |
| Retrieval                  | Applied AI      | Embeddings, Chunking, Hybrid search, RAG evaluation                                                               |
| Agents                     | Applied AI      | Agent loop, State & memory, MCP                                                                                   |
| AI in production           | Applied AI      | Evals, Model routing, Cost & latency                                                                              |
| Reliability                | Production      | Timeouts, Retry & backoff, Partial failures, Background jobs                                                      |
| JavaScript runtime & async | Foundations     | Promises, Event loop, Call stack (In progress), Closures                                                          |
| Backend basics             | Added by Claude | Authorization, Error contracts, Transactions, Composite indexes                                                   |
| Later                      | Added by Claude | HTTP semantics, Cookies & CORS, HTTP caching, Test boundaries, Injection prevention, Session security, and 4 more |

A second roadmap exists, "Pass mid-level full-stack interviews" (34 topics, 2 Learned, 2 In progress), for frames
that choose between roadmaps.

## Layout

### Loots: `/portfolio`

```text
┌ app sidebar ┐┌ Portfolio › Publish ─────────────────────────────────────────────────────┐
│ Profile     ││ PORTFOLIO                                              Version    4        │
│ Portfolio • ││ Publish  [Live]                                        Published  Oct 18   │
│ Memory      ││                                                        Site       Updated  │
│ Engineering ││ ┌ Profile ──────────────────────── Included · Never published ┐            │
│ Terms       ││ │ Name and headline   City and country   …                   │            │
│             ││ └──────────────────────────────────────────────────────────────┘            │
│             ││ ┌ Engineering ─────────────────────────────────────────────────┐           │
│             ││ │ Full-stack Engineer with applied AI     3 of 41   [Show ●]    │           │
│             ││ │ Pass mid-level full-stack interviews    2 of 34   [Show ○]    │           │
│             ││ │ ▾ My explanations  0 of 3 shown                               │           │
│             ││ │   ✓ State & rendering              [○]                         │           │
│             ││ └──────────────────────────────────────────────────────────────┘           │
│             ││──────────────────────────────────────────────────────────────────────────│
│             ││ Open site ↗                      Changes not published   Unpublish  Publish│
└─────────────┘└──────────────────────────────────────────────────────────────────────────┘
```

- One column, `max-w-5xl`, the Profile page's padding. `PageHeading` with facts on the right.
- Sections are `panel` cards, stacked. A sticky footer holds the actions, as on Profile.
- Built today (step 1): heading, the two Profile lists, the footer with Open snapshot, Unpublish and Publish. The
  frames redraw it with the step 3 Engineering section and the step 2 site status, so the page is drawn once, whole.

### The site

```text
┌ Ken Gervacio ─────────────────────── Work  Learning  Resume ┐
│                                                              │
│  John Kenneth Gervacio                                       │
│  Full-stack engineer · Manila, Philippines                   │
│  GitHub  LinkedIn                                            │
│                                                              │
│  [summary, the owner's words]                                │
│                                                              │
│  Now learning ── Server vs client components, Call stack     │
│  ▮▮▮▯▯▯▯▯…  3 of 41 learned                                  │
│                                                              │
│  Work ── experience rows                                     │
│  Projects ── Loots, …                                        │
│  Skills ── groups                                            │
│                                                              │
│  Footer: Published Oct 18 · Built with Loots                 │
└──────────────────────────────────────────────────────────────┘
```

Three routes: `/` (home), `/learning` (the public roadmap) with `/learning/<topic>` for one topic, and `/resume`. The
section names are the brief's call; change them under "Changes from this brief" if a direction reads better with others.

## Frames

### A. Loots: Portfolio page

| Frame | State                                                                                                                                     | Copy                                                                                                     |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| A1    | Never published, Profile saved. Badge "Not published". Facts: Version "None", Published "Never", Profile saved date. Footer: Publish only | Title "Publish", kicker "Portfolio"; **Publish**                                                         |
| A2    | No Profile saved yet. Alert with a link to Profile; Publish disabled                                                                      | "No details saved. Open Profile"                                                                         |
| A3    | Live and current. Badge "Live". Footer: **Open site** (link with an external icon), **Unpublish** (ghost), **Publish**                    | "Live"; "Open site"                                                                                      |
| A4    | Live, then Profile or a switch changed after the publish. Badge "Changes not published", and the same words left of the footer buttons    | "Changes not published"                                                                                  |
| A5    | Publishing: Publish shows progress, other actions disabled; then the toast                                                                | "Publishing…"; toast "Portfolio published"                                                               |
| A6    | Published, but the site didn't refresh (the notify call failed). The publish stands; a fact and an inline action say so                   | Fact Site "Not updated"; button **Update site**; after a retry, Site "Updated"                           |
| A7    | Unpublish pressed: confirm Dialog                                                                                                         | Title "Unpublish portfolio?", line "The site shows a holding page", buttons **Cancel** and **Unpublish** |
| A8    | Publish failed                                                                                                                            | Destructive Alert "Couldn't publish. Try again"                                                          |
| A9    | Dark frame of A3                                                                                                                          | Same                                                                                                     |

### B. Loots: what goes public

| Frame | State                                                                                                                                                                                                                                 | Copy                                                                                                                                                                                                           |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1    | Profile card: two columns, Included and Never published, each a short list. Matches what step 1 publishes                                                                                                                             | "Profile"; "Included": Name and headline, City and country, Summary, Links, Experience, Education, Skills, Projects, Certifications, Languages; "Never published": Email, Phone, Local fields, Education notes |
| B2    | Engineering card: one row per active roadmap with its goal, learned count and a Switch. The roadmap opened last is on by default, the others off                                                                                      | "Engineering"; "Full-stack Engineer with applied AI", "3 of 41"; Switch label "Show on site"                                                                                                                   |
| B3    | Under the roadmaps, a Collapsible: every Learned topic on the shown roadmaps, each with `StatusIcon` Learned, its title, and a Switch, off by default. The owner's own explanation shows as a one-line preview under the title, muted | Trigger "My explanations", count "0 of 3 shown"; row Switch label "Show explanation"                                                                                                                           |
| B4    | One explanation switched on: the row shows the full explanation text in a quote block so the owner reads exactly what goes public                                                                                                     | Count "1 of 3 shown"                                                                                                                                                                                           |
| B5    | Also included, as a fixed list under the roadmaps, so nothing is a surprise                                                                                                                                                           | "Included": Chapters and topics, Statuses, Claude's reviews; "Never published": Notes, Exercises, Sessions                                                                                                     |
| B6    | No roadmap yet                                                                                                                                                                                                                        | "No roadmap yet" / **Open Engineering**                                                                                                                                                                        |
| B7    | No Learned topics yet: the Collapsible is replaced by one muted line                                                                                                                                                                  | "No learned topics yet"                                                                                                                                                                                        |

### C. Site, step 2: the plain page

The first site build: one page with the published Profile, plain type on a white page, no design. It proves the data
path. One frame each.

| Frame | State                                                                                                                                                                                                 | Copy                                                          |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| C1    | Profile published: name as the heading, headline and location, links, summary, then Experience, Projects, Education, Skills, Certifications, Languages as plain sections. Empty sections are left out | Section headings as named; footer "Published Oct 18"          |
| C2    | Nothing published (never, or unpublished): a holding page                                                                                                                                             | Heading "John Kenneth Gervacio"; line "Portfolio coming soon" |
| C3    | Phone at 390 of C1                                                                                                                                                                                    | Same                                                          |

The holding page shows the owner's name from the last cached snapshot when there is one, else the site's configured
name. Annotate; it is not a separate frame.

### D. Site, step 4: two directions for the home page

The creative part. Draw **two** directions for the home page (D1 and D2), each at 1440 and 390, light and dark, with the
same real content. The owner picks one; the rest of section E is then drawn in the chosen direction only. Each
direction has a name and a one-line note on what it is going for.

What both directions must carry:

- The name, headline and location first; links reachable without scrolling on a phone.
- The summary in the owner's words.
- **Now learning**: the In progress topics by name, the learned count, and a compact picture of the whole roadmap
  (chapters as groups, each topic a mark whose shape and word give its status, not colour alone). It links to
  `/learning`. This is the part no other portfolio has; give it room.
- Work (experience), Projects (Loots first), Skills.
- A footer with the publish date and "Built with Loots".

Ideas the owner is open to: anything that shows the site is a playground for Loots, such as the roadmap drawn as a
graph, a live "last published" line, or a section that reads like a changelog of what he learned. Keep each idea
grounded in data the snapshot has. Nothing that needs a server, a login or a model call.

| Frame    | State                                   | Copy                                                     |
| -------- | --------------------------------------- | -------------------------------------------------------- |
| D1, D2   | Home, Profile and Engineering published | Nav "Work", "Learning", "Resume"; section names as above |
| D1d, D2d | Dark frames                             | Same                                                     |
| D1p, D2p | Phone at 390                            | Same; nav folds to a menu button                         |

### E. Site: the other pages, in the chosen direction

| Frame | State                                                                                                                                                                                                                                   | Copy                                                                                        |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| E1    | `/learning`: the goal as the heading, the learned count, then each chapter with its area and its topics, each topic with its status icon and word. Learned and In progress topics link to their page; Not started topics are plain text | Heading "Full-stack Engineer with applied AI"; "3 of 41 learned"; area names as in the data |
| E2    | Two roadmaps shown: a switch between them at the top, the address keeps which (`/learning?r=`)                                                                                                                                          | Goals as the options                                                                        |
| E3    | `/learning/<topic>` for a Learned topic: title, chapter, status and date learned, then Claude's review sheet as a list of points (question, explanation, example in a code block, common mistake)                                       | "Learned Oct 12"; point labels "Example", "Common mistake"; note "Review written by Claude" |
| E4    | E3 with the owner's explanation switched on: a quote block above the review, labelled as his                                                                                                                                            | "In my words"                                                                               |
| E5    | `/learning/<topic>` for an In progress topic with no review yet                                                                                                                                                                         | "In progress"; "No review yet"                                                              |
| E6    | `/resume`: the Profile laid out as a one-page resume, print-friendly, with **Download PDF**. Annotate that the PDF button is later (see below)                                                                                          | "Download PDF"                                                                              |
| E7    | Not found (an old topic link, a mistyped address)                                                                                                                                                                                       | "Page not found" / link "Home"                                                              |
| E8    | Phone at 390 of E1 and E3                                                                                                                                                                                                               | Same                                                                                        |

## Smaller screens

| Surface            | Width | Layout                                                                                                                                                                        |
| ------------------ | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loots `/portfolio` | 1280  | As 1440, narrower column                                                                                                                                                      |
| Loots `/portfolio` | 390   | Facts drop under the title (as `PageHeading` does today); Included and Never published stack; footer keeps Publish on the right and moves Open site and Unpublish into a menu |
| Site               | 1024  | Same structure as desktop; the roadmap picture may wrap to more rows                                                                                                          |
| Site               | 390   | One column; nav behind a menu button; the roadmap picture becomes a compact strip per chapter; code blocks in reviews scroll inside themselves, never the page                |

Every screen works at 390px with no sideways scroll.

## Later or not planned

- **F1. Lab, Later · not planned:** one low-detail frame of a site section for experiments (a small Loots feature tried
  in public first). Enough to see where it would sit in the nav, nothing more.
- **F2. Resume PDF, Later:** E6's Download PDF. Profile already renders a PDF in Loots; whether the site reuses it
  is an open question for the build, not for the drawing.
- Visitor chat is not planned; do not draw it.

## Behaviour to show or annotate

- Nothing on the site changes until Publish. A4's "Changes not published" is how the owner sees the gap.
- Publish covers everything at once: Profile, the shown roadmaps, the switched-on explanations. Switches on the Loots
  page save at once but only reach the site on the next Publish, which is why they flip the badge to A4.
- Explanations are off by default and are shown in full (B4) before they can go public.
- The site keeps serving the last published pages if Loots is down; there is no error state for visitors.
- Loots keyboard: switches and Collapsible are Tab stops; the Unpublish confirm opens with focus on Cancel; Ctrl or Cmd
  - K stays with the app search.
- Site keyboard: a skip link to the content, the nav and every topic link are Tab stops, and the phone menu closes on
  Escape.
- Status is never colour alone, on either surface: each topic state has its icon shape and its word.

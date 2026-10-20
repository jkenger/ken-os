# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One user: the owner (Ken), the only account the app allows. He signs in on desktop and on his phone and uses Loots as his personal work hub: keeping career details current, learning full-stack and AI engineering, looking up terms while reading, and preparing what goes public.

Other people never sign in. They see only the public portfolio, which is a separate app (`apps/portfolio`) fed by a snapshot the owner publishes from the private Portfolio module here.

## Product Purpose

Loots is a private, hosted operating system for one developer. Each recurring workflow becomes a module under it, and Claude works inside it through the connector. Success means the owner stops repeating chores (finding the latest resume, re-explaining what he has learned) and keeps one trustworthy record he and Claude both work from.

## Positioning

Built for exactly one person, with Claude as a working participant rather than a bolted-on chat. Claude reads the roadmap, reports progress, saves exercises, notes and reviews through the connector, under rules the app enforces (it marks a topic Learned only with the owner's own words as evidence and never overrides what the owner set). A general SaaS tool could not truthfully claim either.

## Operating Context

- Modules today: Profile (career details, typed or imported from a resume chosen in Google Drive), Engineering (roadmap, topic statuses, Claude's reports, reviews and notes on one page), Terms (select text, press Explain or E; saved terms underlined across the app), Portfolio (private module that publishes one snapshot), Memory.
- Claude teaches in a claude.ai Project connected to Loots over MCP; Loots is where the results land and get reviewed.
- Google Drive owns the resume file; Loots reads it only.
- Hosted on Vercel; reachable from any of the owner's devices.

## Capabilities and Constraints

- Single owner; another Google account cannot get in. OAuth, session and origin checks are deliberate boundaries.
- Agent access to Drive is read only. Any future write to an outside system needs an explicit approval step.
- Everything Claude saves is untrusted input and is shown only after checks (exercises run only in the browser runner).
- Next.js app with shadcn/ui primitives on the shadcn default setup (Nova preset), Tailwind 4, Geist and Geist Mono. Every control is built from a shadcn primitive; no raw form or table elements outside `components/ui` (enforced by `src/lib/shadcn-primitives.test.ts`).
- Undecided: up to 3 Engineering roadmaps at once (`docs/architecture/engineering-roadmaps.md`, proposed); later modules in `docs/product/brief.md` are candidates, not commitments.

## Brand Commitments

- Name: Loots.
- Screen copy is app language: names, actions and states, not sentences. Full sentences only in content (lessons, Claude's answers, term explanations). No taglines, no narrating, no em dashes. Word list and rules: `docs/product/app-language.md`.
- The look starts from the untouched shadcn default on purpose; Loots additions go one deliberate change at a time in the "Loots" section of `globals.css` and in components outside `components/ui`. This is a binding constraint, not an oversight to fix.
- Status is carried by icon and word (Badge variants), never by colour alone.

## Evidence on Hand

- The owner's real Profile data and Engineering progress in the app's database.
- Mockup briefs in `docs/mockups/`; layout rules in `docs/architecture/roadmap-ui.md` and `docs/architecture/design-system.md`.
- No testimonials, users, metrics or press exist. Do not invent any.

## Product Principles

1. One owner, one source of truth: a screen shows what is stored, never a guess or a silent substitute.
2. The owner decides; Claude proposes. Claude's work is visible, reviewable and never overrides the owner's own words or settings.
3. A module earns its place by removing a chore the owner actually repeats.
4. Calm, scannable app frame; personality lives in content, not chrome.

## Accessibility & Inclusion

Meaning never depends on colour alone. Body text meets 4.5:1 contrast in both light and dark themes, muted text included.

# Jobs feedback session, 2026-11-04

Brief recap of today's work on the Jobs page, driven by a live feedback pass plus bugs found while using it.

## Infinite scroll

- Replaced the full-list fetch with cursor-based pagination, 10 at a time, for the New list (#194).
- Fixed the list resetting its loaded items and scroll position when going back from a job's detail page — `router.back()` instead of a plain link, so the browser's own back/forward cache is reused (#195).

## Filter panel cleanup

- Dropped the always-on "Anytime" filter chip — it only shows now when a filter is actually restricting something, like every other filter (#196).
- Fixed saving a filter (e.g. Country) not reflecting in the list until a manual reload (#201).

## New vs Viewed

- Added a "New" badge to each card, cleared the first time its detail page is opened (#197).
- Made the badge expire after 3 days even if never opened, so it doesn't linger for months on postings nobody gets to (#198).

## Card content

- Added a posted-date to each card: relative time under a week ("50m ago"), a calendar date past that ("Oct 23") (#199).
- Added a company logo via a best-effort domain guess + favicon lookup, falling back to initials (#200).
- Added the salary range below the skills row, right-aligned, when the source gave a real min/max instead of one averaged number (#202).

## Bugs found and fixed

- Fixed skill logos not rendering in production after switching to `next/image` — Simple Icons' CDN serves SVG without a `.svg` in the URL, so Next's optimizer silently failed on every one (#203).

## Still open

- Second action-button row on the card, separated by a Separator — not started, needs a decision on what the buttons are.
- Applied-status tracking, the preferences/hero-section redesign, and resume tailoring — parked for a planning session.

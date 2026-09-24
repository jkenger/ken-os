# Design System — architecture contract

Status: first slice implemented locally; hosted verification and owner review pending. Product requirements and settled scope are in [the Design System product spec](../product/design-system.md). This is a module in the existing Next.js app, not another deployable service.

## One-way dependency graph

```text
Versioned design contract in Git
  ├─ semantic token values ──→ generated CSS variables ──→ Tailwind/shadcn primitives
  │                                                        └─→ live gallery examples
  ├─ usage rules + decision log ────────────────────────────→ hosted module
  └─ portable rules + token values ──→ Markdown files ──→ validated ZIP export
```

The design contract owns explicit shared token values, human-readable usage rules, release status, version, and decision entries. Generated CSS is the application's token output, not a second place to edit values. Shared components own behavior and their concrete markup; the gallery imports those same components. The contract describes component intent and anatomy but does not pretend that prose automatically enforces all styling. Visual and interaction checks guard that boundary.

Do not derive CSS from `SKILL.md`, scrape browser-computed styles to assemble a server export, or maintain a separately edited skill copy. The portable skill and gallery consume the same versioned content. `/design-preview` is an experiment surface and cannot mutate or publish the contract.

## Code placement

| Area | Responsibility |
| --- | --- |
| `apps/web/src/features/design-system/contract.ts` | Typed version/status, semantic tokens, usage rules, and decision entries; no React or server secrets. |
| `apps/web/src/features/design-system/examples.tsx` | Curated live examples importing `components/ui` primitives. No cloned demonstration components. |
| `apps/web/src/features/design-system/skill.ts` | Deterministic conversion of the contract to `SKILL.md` and Markdown references. |
| `apps/web/src/app/design-system/page.tsx` | Owner-only hosted gallery using the existing workspace shell. |
| `apps/web/src/app/api/design-system/export/route.ts` | Owner-only ZIP download, using the existing safe ZIP utility and private no-store headers. |
| `apps/web/src/app/design-tokens.generated.css` | Generated CSS variables imported by `globals.css`; do not hand-edit. |
| `.agents/skills/ken-os-design/` | Checked-in generated snapshot for local agents; checked against the contract before merge. |

This is not a new package boundary. Keep the feature inside `apps/web` until another app actually consumes it. The generated skill snapshot is useful locally, but the deployed module does not read files outside `apps/web` at request time: Vercel packaging should not determine whether export works.

## Generation and consistency

Use a small deterministic script to emit the token CSS and checked-in skill snapshot from the typed contract. In development, regeneration is explicit; `check`/CI fails if generated files are stale. The production build uses checked-in, verified outputs rather than writing to the repository at request time. Use stable ordering and formatting so generated diffs are reviewable.

The hosted export can render Markdown from the bundled contract at request time, then call the existing `exportSkillZip` helper. Round-trip the result through `parseSkillBundle` in tests and compare files/digest. Token tests assert that generated CSS matches the contract; component tests assert that the gallery uses the shared primitive APIs. Do not add a second token table to the database.

The first shared input or other missing primitive must be added to `components/ui` before the gallery presents it as a reusable component. Patterns can remain composed examples rather than become primitives prematurely. Keep Tailwind classes static enough for its scanner; generate CSS values, not arbitrary runtime utility class names.

## Version and approval model

- Start with a clearly labeled working prerelease (for example `0.1.0-working.1`). It may be exported for trial use; the page, ZIP filename, and bundle body all state `working / not yet approved`.
- A design change starts in `/design-preview` when exploration is needed. Owner selection leads to a contract change, real component/token change, decision-log entry, regenerated outputs, tests, and visual review.
- Promotion to `approved 1.0.0` requires an explicit owner review of the hosted gallery. Merely merging code, deploying, or downloading a working ZIP does not approve it.
- After approval, a change that alters an established rule bumps the design version and records what changed. Git preserves prior versions; v1 does not provide an in-app historical-release browser or database approval record.

## Access and trust

The page uses the existing owner session, as `/skills` does. The export route independently checks the session; hiding a button is not access control. Return `Cache-Control: private, no-store` and a fixed Markdown-only ZIP structure. Do not include environment values, user data, sample Project Memory content, or source-repository paths in the portable bundle. Exporting does not enable the skill for the resume agent or install it elsewhere.

## Verification gate

1. Deterministic generation check: token CSS and repo skill snapshot match the contract.
2. ZIP round-trip: correct files, safe paths, metadata, digest, working label, and version.
3. Authorization: signed-out page and API requests cannot access the module/export.
4. Component fidelity: examples import the actual shared components and show honest states; no visual duplicate with divergent behavior.
5. Rendered desktop/mobile checks: readable typography, density, focus, wrapping, no clipped navigation or horizontal overflow.
6. Hosted check after deployment: authenticated gallery, working-status labeling, and ZIP download operate on the deployed build. A successful local build alone is not hosted verification.

## Deliberate deferrals

No browser token editor, runtime schema migration, Figma sync, theme variants, new package/service, global installer, or automatic release workflow in v1. Add any of these only when a concrete workflow needs them.

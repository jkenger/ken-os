# Skills library

## Decision

Treat Skills as a first-class product capability because a skill may serve the resume assistant, future project agents, and automations. Its initial management UI lives at `/skills` under the agent area. This document distinguishes the implemented first slice from later ideas.

## First user outcome

The owner uploads `SKILL.md` or a ZIP containing `SKILL.md` and Markdown files under `references/`, reviews its name, description, and files, then explicitly enables one version for the resume agent. They can disable it without deleting the uploaded source.

## First-slice boundaries

- Private, single-owner library; no marketplace, public sharing, or automatic installation from URLs.
- Store parsed Markdown content, metadata, digest, and immutable versions in PostgreSQL. Uploads are disabled by default; up to three skill names may be enabled at once for the resume agent.
- Validate YAML frontmatter and archive paths; enforce file types, count, and size limits; reject traversal, symlinks, duplicate paths, and malformed archives.
- Preview instructions before activation. Uploaded text is untrusted input; it never overrides app policy or grants permissions.
- Support instruction and reference Markdown only. Do **not** execute uploaded scripts or expose new network/filesystem tools because a bundle asks for them.
- At run time, supply enabled `SKILL.md` files to the read-only resume agent and let it fetch relevant Markdown references through a bounded read-only tool. Show the enabled skill versions supplied with each response.
- If skill instructions request an action outside the agent's permitted tools, the action remains unavailable. External writes still require the app's explicit approval flow.

## Acceptance criteria

1. A valid skill survives redeploy and can be enabled for an agent.
2. Invalid or unsafe bundles are rejected with an actionable reason.
3. Disabling a skill prevents it from appearing in subsequent agent runs; prior versions remain inspectable.
4. The user can see which enabled skill versions were supplied to the agent with a response; this is not a claim that the model relied on each one.
5. Uploading a skill cannot grant it new tools or execute code.

## Later

### Portable export (implemented)

- `Copy SKILL.md`, `Download SKILL.md`, and `Export ZIP` are available for each immutable version. The ZIP contains one top-level skill folder, its `SKILL.md`, and supported Markdown references; a round-trip test verifies unchanged content and digest.
- The version and file list appear before export. Exports copy stored source only, without connection tokens or generated runtime context. They do not guarantee identical behavior in another agent or product.
- Assignment remains separate from export. Disabling a skill for the resume agent does not remove the source or prevent its owner from exporting it.

### Assignment and installation scopes

The private library is shared storage, but **assignment is per agent by default**. When more Ken OS agents exist, add an explicit assignment model and consider an opt-in “all Ken OS agents” target. An all-agent assignment must not grant tools or bypass each agent's permissions, and should be reviewed for context noise and conflicting instructions.

Installing a skill for Codex across unrelated repositories is a different action from enabling it in Ken OS. The hosted app can export a bundle or offer copy/paste; it cannot directly install files on the owner's computer. A later local installer may take a reviewed export and ask whether to place it in a repository skill directory or the user's personal skill directory. It must preview the target, detect name conflicts, and require explicit confirmation before overwriting anything. No remote/global Codex installation is part of the current app.

Version diffs and rollback, dependency declarations, binary assets, scripts in a sandbox, shared catalogs, and import from Git/Drive should each be evaluated after the basic library is useful. The current implementation is app-managed; it does not upload bundles to OpenAI's Skills API.

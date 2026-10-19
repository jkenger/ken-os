# Mockup briefs

A brief says which frames, states and words to draw for a screen, so another agent can make the mockups and hand them
back. The decisions behind a screen stay in `docs/architecture/`; each brief links to its spec. Code follows the chosen
mockups.

- Briefs live here, one per screen or feature, named after it (`design-studio.md`).
- The mockups themselves are a design canvas, linked from the brief and the handoff README. The README goes in the
  project files, in the folder named in the brief's "Handoff: what to return" section, not in the repo. Claude agents never
  export or render PNGs; PNGs are only for an outside agent that cannot open the canvas.

| Brief                                                      | Spec                                                                               |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [Design Studio](design-studio.md)                          | [design-studio.md](../architecture/design-studio.md)                               |
| [Engineering with Claude](engineering-claude-connector.md) | [engineering-claude-connector.md](../architecture/engineering-claude-connector.md) |
| [Portfolio](portfolio.md)                                  | [portfolio.md](../architecture/portfolio.md)                                       |

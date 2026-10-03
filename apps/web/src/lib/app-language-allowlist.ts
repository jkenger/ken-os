/**
 * Screen copy that broke the app language rule when the check landed (3 Oct 2026).
 * Each rewrite slice in docs/product/app-language-rewrite.md deletes its entries; the test fails on stale ones.
 * Never add to this list. Slice 9 deletes the file.
 * Entries are a blank line apart so slices that delete neighbouring entries merge without conflicts.
 */
export const appLanguageAllowlist: { file: string; text: string }[] = [











  { file: "components/design-system-workspace.tsx", text: "Agent skills" },

  { file: "components/design-system-workspace.tsx", text: "Density follows the work." },

  { file: "components/design-system-workspace.tsx", text: "Design, made repeatable." },

  { file: "components/design-system-workspace.tsx", text: "Quiet by design." },

  { file: "components/design-system-workspace.tsx", text: "Resume hub" },

  { file: "components/design-system-workspace.tsx", text: "The pieces we actually use." },

  { file: "components/design-system-workspace.tsx", text: "The visual language behind Ken OS, shown through the real pieces we use—and packaged to try in another personal project." },

  { file: "components/design-system-workspace.tsx", text: "Try the system somewhere new." },

  { file: "components/design-system-workspace.tsx", text: "Why it looks this way." },


















































































];

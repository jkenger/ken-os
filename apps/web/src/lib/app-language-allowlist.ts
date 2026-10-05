/**
 * Screen copy that broke the app language rule when the check landed (3 Oct 2026).
 * Each rewrite slice in docs/product/app-language-rewrite.md deletes its entries; the test fails on stale ones.
 * Never add to this list. Slice 9 deletes the file.
 * Entries are a blank line apart so slices that delete neighbouring entries merge without conflicts.
 */
export const appLanguageAllowlist: { file: string; text: string }[] = [





  { file: "app/api/skills/[id]/export/route.ts", text: "Could not export this skill." },

  { file: "app/api/skills/[id]/route.ts", text: "Could not update skill." },

  { file: "app/api/skills/route.ts", text: "Could not save this skill." },




  { file: "components/design-system-workspace.tsx", text: "Agent skills" },

  { file: "components/design-system-workspace.tsx", text: "Density follows the work." },

  { file: "components/design-system-workspace.tsx", text: "Design, made repeatable." },

  { file: "components/design-system-workspace.tsx", text: "Quiet by design." },

  { file: "components/design-system-workspace.tsx", text: "Resume hub" },

  { file: "components/design-system-workspace.tsx", text: "The pieces we actually use." },

  { file: "components/design-system-workspace.tsx", text: "The visual language behind Ken OS, shown through the real pieces we use—and packaged to try in another personal project." },

  { file: "components/design-system-workspace.tsx", text: "Try the system somewhere new." },

  { file: "components/design-system-workspace.tsx", text: "Why it looks this way." },



































  { file: "components/memory-workspace.tsx", text: "A source-linked handoff from reviewed decisions and work receipts—not a transcript warehouse." },

  { file: "components/memory-workspace.tsx", text: "Copy now—shown only once" },

  { file: "components/memory-workspace.tsx", text: "Could not copy handoff." },

  { file: "components/memory-workspace.tsx", text: "Could not copy key." },

  { file: "components/memory-workspace.tsx", text: "Could not create key." },

  { file: "components/memory-workspace.tsx", text: "Could not review item." },

  { file: "components/memory-workspace.tsx", text: "Could not revoke key." },

  { file: "components/memory-workspace.tsx", text: "Could not save correction." },

  { file: "components/memory-workspace.tsx", text: "Could not save decision." },

  { file: "components/memory-workspace.tsx", text: "Could not save receipt." },

  { file: "components/memory-workspace.tsx", text: "New work receipt" },

  { file: "components/memory-workspace.tsx", text: "No open items in approved receipts yet." },

  { file: "components/memory-workspace.tsx", text: "No receipts waiting for review." },

  { file: "components/memory-workspace.tsx", text: "Nothing approved yet. Capture a decision or receipt, then review its evidence below." },

  { file: "components/memory-workspace.tsx", text: "Pick up where you left off." },

  { file: "components/memory-workspace.tsx", text: "Proposed, not confirmed: {} decisions and {} receipts." },

  { file: "components/memory-workspace.tsx", text: "Receipt" },

  { file: "components/memory-workspace.tsx", text: "Receipt saved as proposed. Review it below before it enters the handoff." },

  { file: "components/memory-workspace.tsx", text: "Record as work happens." },

  { file: "components/memory-workspace.tsx", text: "Request failed." },

  { file: "components/memory-workspace.tsx", text: "Save proposed receipt" },

  { file: "components/memory-workspace.tsx", text: "Use a scoped key." },

  { file: "components/memory-workspace.tsx", text: "Work receipts" },









  { file: "components/skill-manager.tsx", text: "Could not copy. Download SKILL.md instead." },

  { file: "components/skill-manager.tsx", text: "Could not update skill." },

  { file: "components/skill-manager.tsx", text: "Enable for resume agent" },

  { file: "components/skill-manager.tsx", text: "No skills yet." },

  { file: "components/skill-manager.tsx", text: "Upload instructions." },

  { file: "components/skills-workspace.tsx", text: "AGENT CAPABILITIES" },

  { file: "components/skills-workspace.tsx", text: "Skills." },

  { file: "components/terms/term-lookup.tsx", text: "Saving..." },

  { file: "components/terms/terms-page.tsx", text: "Could not remove it" },

  { file: "components/terms/terms-page.tsx", text: "Could not remove it." },

  { file: "components/terms/terms-page.tsx", text: "Words you looked up." },




  { file: "components/workspace-shell.tsx", text: "Receipts" },


  { file: "features/project-memory/api.ts", text: "Could not complete the memory request." },
];

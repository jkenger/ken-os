/**
 * Screen copy that broke the app language rule when the check landed (3 Oct 2026).
 * Each rewrite slice in docs/product/app-language-rewrite.md deletes its entries; the test fails on stale ones.
 * Never add to this list. Slice 9 deletes the file.
 * Entries are a blank line apart so slices that delete neighbouring entries merge without conflicts.
 */
export const appLanguageAllowlist: { file: string; text: string }[] = [
  { file: "app/api/auth/google/callback/route.ts", text: "Could not verify Google account." },

  { file: "app/api/auth/google/callback/route.ts", text: "This Google account does not match OWNER_EMAIL." },

  { file: "app/api/resume/content/route.ts", text: "Could not load resume content." },

  { file: "app/api/resume/route.ts", text: "Could not refresh resume." },

  { file: "app/api/resume/route.ts", text: "Could not select resume." },

  { file: "app/api/skills/[id]/export/route.ts", text: "Could not export this skill." },

  { file: "app/api/skills/[id]/route.ts", text: "Could not update skill." },

  { file: "app/api/skills/route.ts", text: "Could not save this skill." },

  { file: "app/page.tsx", text: "A home for the things you keep coming back to." },

  { file: "app/page.tsx", text: "Could not reach Google Drive." },

  { file: "app/page.tsx", text: "Your latest work, ready when you are." },

  { file: "components/design-system-workspace.tsx", text: "Agent skills" },

  { file: "components/design-system-workspace.tsx", text: "Density follows the work." },

  { file: "components/design-system-workspace.tsx", text: "Design, made repeatable." },

  { file: "components/design-system-workspace.tsx", text: "Quiet by design." },

  { file: "components/design-system-workspace.tsx", text: "Resume hub" },

  { file: "components/design-system-workspace.tsx", text: "The pieces we actually use." },

  { file: "components/design-system-workspace.tsx", text: "The visual language behind Ken OS, shown through the real pieces we use—and packaged to try in another personal project." },

  { file: "components/design-system-workspace.tsx", text: "Try the system somewhere new." },

  { file: "components/design-system-workspace.tsx", text: "Why it looks this way." },

  { file: "components/lab/assessment/lab-assessment.tsx", text: "Could not save." },

  { file: "components/lab/assessment/lab-assessment.tsx", text: "Could not start." },

  { file: "components/lab/assessment/lab-assessment.tsx", text: "Could not write the questions." },

  { file: "components/lab/assessment/lab-assessment.tsx", text: "No lessons yet, so two short screening questions estimate how deep you go." },

  { file: "components/lab/assessment/lab-assessment.tsx", text: "Ready when you are." },

  { file: "components/lab/assessment/lab-assessment.tsx", text: "Saving..." },

  { file: "components/lab/assessment/lab-assessment.tsx", text: "Starting..." },

  { file: "components/lab/assessment/lab-assessment.tsx", text: "The assessment goes chapter by chapter, in course order. Written topics get one question, and a follow-up only where it helps. Chapters with no lessons yet get two short screening questions. Topics you've already proven are skipped." },

  { file: "components/lab/assessment/lab-assessment.tsx", text: "Writing questions..." },

  { file: "components/lab/explore/lab-home-explore.tsx", text: "{} stages to {}, about {} weeks." },

  { file: "components/lab/explore/lab-home-explore.tsx", text: "Solid blocks are proven or placed. Hatched blocks rest on screening answers only. The red line is your direction's target." },

  { file: "components/lab/lab-topic.tsx", text: "Could not write questions" },

  { file: "components/lab/lab-topic.tsx", text: "Could not write the lesson" },

  { file: "components/lab/lab-topic.tsx", text: "Researching and writing, about a minute..." },

  { file: "components/lab/lab-topic.tsx", text: "Writing questions..." },

  { file: "components/lab/lab-topics.tsx", text: "Could not write the placement check" },

  { file: "components/lab/lab-topics.tsx", text: "The whole course, in order." },

  { file: "components/lab/lab-topics.tsx", text: "Writing questions..." },

  { file: "components/lab/practice/lab-practice.tsx", text: "Could not write today's set." },

  { file: "components/lab/practice/lab-practice.tsx", text: "Writing today's set..." },

  { file: "components/lab/profile/guide-chat.tsx", text: "Sending..." },

  { file: "components/lab/profile/guide-chat.tsx", text: "The Guide is thinking..." },

  { file: "components/lab/profile/lab-profile.tsx", text: "None yet. When the Guide suggests a chapter your products need and you add it, it shows here unwritten, with two short screening questions of its own." },

  { file: "components/lab/profile/lab-profile.tsx", text: "Scanning..." },

  { file: "components/lab/profile/lab-profile.tsx", text: "Writing questions..." },

  { file: "components/lab/profile/skyline.tsx", text: "Solid blocks are proven or placed. Hatched blocks rest on screening answers only." },

  { file: "components/lab/topic/answers.tsx", text: "Could not check." },

  { file: "components/lab/topic/answers.tsx", text: "Could not submit." },

  { file: "components/lab/topic/answers.tsx", text: "Grading..." },

  { file: "components/lab/topic/answers.tsx", text: "Running..." },

  { file: "components/lab/topic/labs.tsx", text: "Could not load the solution." },

  { file: "components/lab/topic/labs.tsx", text: "Could not run the tests." },

  { file: "components/lab/topic/labs.tsx", text: "Running real requests..." },

  { file: "components/lab/topic/labs.tsx", text: "Running..." },

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

  { file: "components/resume-workspace.tsx", text: "Ask about your resume." },

  { file: "components/resume-workspace.tsx", text: "Could not answer." },

  { file: "components/resume-workspace.tsx", text: "Could not connect to Google Drive." },

  { file: "components/resume-workspace.tsx", text: "Could not open Google Picker." },

  { file: "components/resume-workspace.tsx", text: "Could not select file." },

  { file: "components/resume-workspace.tsx", text: "One selected file. Always current." },

  { file: "components/resume-workspace.tsx", text: "Resume hub" },

  { file: "components/resume-workspace.tsx", text: "Resume hub." },

  { file: "components/skill-manager.tsx", text: "Could not copy. Download SKILL.md instead." },

  { file: "components/skill-manager.tsx", text: "Could not update skill." },

  { file: "components/skill-manager.tsx", text: "Enable for resume agent" },

  { file: "components/skill-manager.tsx", text: "No skills yet." },

  { file: "components/skill-manager.tsx", text: "Upload instructions." },

  { file: "components/skills-workspace.tsx", text: "AGENT CAPABILITIES" },

  { file: "components/skills-workspace.tsx", text: "Skills." },





  { file: "components/workspace-shell.tsx", text: "Agent skills" },

  { file: "components/workspace-shell.tsx", text: "Find a module..." },

  { file: "components/workspace-shell.tsx", text: "Jump to a module..." },

  { file: "components/workspace-shell.tsx", text: "Receipts" },

  { file: "components/workspace-shell.tsx", text: "Resume hub" },

  { file: "features/project-memory/api.ts", text: "Could not complete the memory request." },
];

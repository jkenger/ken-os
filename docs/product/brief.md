# Product brief

## Purpose

Ken OS is a private, hosted developer operating system. It brings important artifacts and connected workflows into one place, with agents that help inspect and work with them.

## Initial problem

Finding the latest resume in Google Drive and downloading it each time is repetitive and error prone.

## First user outcome

After signing in, the owner selects a resume from Google Drive once. The dashboard remembers that exact file, shows its latest state, previews it, downloads its latest content, and provides a route back to edit the original.

## MVP scope

1. Google sign in for one configured owner.
2. Google Picker file selection for Docs, PDF, or DOCX.
3. Canonical resume reference stored by Drive file ID.
4. File metadata and availability refreshed on dashboard load and on demand.
5. Inline preview: PDF export for Google Docs, PDF content for PDFs; Google Drive preview for DOCX.
6. Download latest version and open source file for editing.
7. Read-only assistant for Google Docs resume content.

## Later modules to evaluate

- Career: job opportunities, tailored resume copies, cover letters, application history.
- Artifacts: bio, project briefs, certificates, and reusable answers.
- Publishing: a private [Blog Writing Studio](blog-writing-studio.md) for owner-authored technical diary entries, followed later by public portfolio curation.
- Projects: repository status, decisions, tasks, and release notes. The proposed [Project Memory module](project-memory.md) starts with decisions and evidence-backed work receipts for Ken OS itself.
- Knowledge: notes, bookmarks, and searchable personal context.
- Automation: recurring checks, scheduled agent work, and an approval inbox.
- Skills: private, versioned skill uploads that can be enabled for chosen agents; see [the proposal](skills.md).

These are candidates, not MVP commitments. Each should prove a recurring personal workflow before it becomes a module.

## Decisions

- Hosted web app, accessible from multiple devices.
- Google Drive owns the resume content in the MVP.
- File selection uses Google Picker and `drive.file` access.
- Single owner, with a database model that can add users later.
- One read-only agent to start. Writes to Drive will require explicit approval when introduced.

## Acceptance criteria

- A selected resume survives browser restarts and redeployments.
- Updating that same Drive file is reflected on the next dashboard refresh.
- A deleted or inaccessible file produces a clear replacement path.
- The app never silently switches to another file with a similar name.
- Preview and download return the current content, not a stale stored copy.
- Another Google account cannot access the app even if it obtains the sign-in URL.

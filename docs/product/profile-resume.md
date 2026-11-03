# Profile and resume builder

Status: step 1 built 12 Oct 2026, step 2 built 13 Oct 2026, step 3 built 14 Oct 2026, step 4 built 24 Oct 2026; step 5 redefined 24 Oct 2026 as resume uploads with Autofill (Drive dropped), all three parts built (Drive removed 25 Oct 2026). Replaces the Resume module. Decisions below were agreed with the owner in chat on 12 Oct 2026.

## The idea in one line

Loots stores the owner's career details as structured fields, and every resume is a view of those fields through a template.

Today Loots stores a pointer to one Drive file. After this change it stores the content itself, so templates, AI writing, a public link and saving to Drive all build on the same data.

## Decisions

| Question                    | Decision                                                                                                                                                                         |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Where it lives              | A top-level **Profile** module replaces the Resume module.                                                                                                                       |
| Engineering's "Profile" tab | Dropped. Engineering became one roadmap page on 13 Oct 2026, so it has no Profile tab and nothing to rename.                                                                     |
| Job market                  | International fields by default. Optional local fields (photo, birthdate, civil status, nationality, full address) are off unless turned on, and ATS templates never print them. |
| Flow order                  | Details first, then the AI pass, then preview with a template switcher. Switching templates never reruns the AI.                                                                 |
| Drive reading               | The picked Drive file is read only. When it changes, Loots shows what changed and the owner approves before anything is overwritten.                                             |
| Drive writing               | Loots saves its own file to Drive when the owner turns that on. The original picked file is never written.                                                                       |
| Public link                 | Shows a published snapshot. Edits go live only on republish. Phone and address hidden by default. `noindex` by default.                                                          |

## Two ways in, one form

Both flows end in the same Profile form.

- **Import from Drive.** Choose a resume with the existing Google Picker. Loots extracts the text, the AI turns it into fields, and the owner reviews them in the form before saving. Nothing is saved until the owner saves.
- **Build from scratch.** The form opens prefilled with what Loots already knows (name and email from sign-in), and the owner fills the rest.

Google sign-in only gives name, email and photo. It does not give work history, so "prefill" is honest about that.

## Profile fields

International set, in resume order:

- **Contact:** full name, headline (target title), email, phone, city, country, links (label and URL).
- **Summary:** a short paragraph.
- **Experience:** company, title, location, start month, end month or Present, bullet points.
- **Education:** school, degree, field, start, end, notes.
- **Skills:** groups, each with a name and a list (for example "Languages: TypeScript, Go").
- **Projects:** name, link, one-line description, bullet points.
- **Certifications:** name, issuer, date.
- **Languages:** language and level.

Optional local fields (off by default): photo, birthdate, civil status, nationality, full address, references.

Dates are stored as `YYYY-MM`. Templates decide how they print.

## Templates

All three are one column and ATS-safe: standard headings (Experience, Education, Skills), no tables, text boxes, icons or photos, contact details in the body rather than the page header, plain fonts, newest first, one date format, and a real text PDF.

- **Classic:** the safe default.
- **Compact:** denser, fits a long history on one page.
- **Technical:** skills and projects near the top, for engineering roles.

No two-column templates. They read well to people and badly to ATS parsers.

## AI

Two jobs, both following the existing structured-output pattern in `packages/agents` (a zod schema as `outputType`, a prompt version string saved with the result, resume text treated as untrusted data).

- **Import:** text in, Profile fields out. It copies what is there and never fills gaps with guesses.
- **Rewrite:** tightens bullets, writes the summary, uses strong verbs. It works only from facts in the Profile, never invents numbers or experience, and shows each change so the owner can accept or undo it.

## Public link

The first page in Loots anyone can open without signing in.

- Lives at `/r/<slug>`, so it never clashes with app routes.
- The slug is chosen by the owner or random, lowercase, unique.
- Publish saves a snapshot. Unpublish makes the link return 404. Edits never go live until republish.
- Phone, address and every local field are hidden unless the owner turns each one on.
- `noindex` by default, with a switch to allow search engines.
- PDF download from the same page.
- No `WorkspaceShell`, no term lookup, no session reads, no email or user id in the page.

`docs/architecture/auth-sign-in.md` and `docs/architecture/system-overview.md` get a section on public pages when this ships.

## Drive sync

Two one-way paths, never a loop.

- **Drive to Loots.** Each import stores the Drive file's `modifiedTime`. On page load, if Drive reports a newer time, Profile shows "Drive file changed" with a Review action. Review runs the import again and shows the new fields against the saved ones. The owner accepts per section.
- **Loots to Drive.** When turned on, saving a resume writes a Google Doc (or PDF) that Loots created, in the owner's Drive. The current `drive.file` permission covers files the app creates, so no new Google permission or verification is needed. This is a write to an external system, so it is off until the owner turns it on, and the screen shows when it last saved.

## Build order

1. **Profile and import.** Profile page, form, import from Drive with review, prefill, navigation change, Engineering rename.
2. **Templates and preview.** Three templates, preview with a switcher, PDF download.
3. **AI rewrite.** Rewrite with accept or undo per change.
4. **Public link.** Built 24 Oct 2026 as the Portfolio's public resume PDF; see "Step 4 design".
5. **Uploads and Autofill.** Replaces Drive sync (dropped 24 Oct 2026); see "Step 5 design". The Drive sections in this spec are history: Drive was removed from the app on 25 Oct 2026.

Each step ships on its own and leaves the app working.

## Step 5 design

Agreed with the owner 24 Oct 2026. Google Drive stops being a source of truth: the whole Drive plan (import, Picker, Drive file section, Open in Drive, saving to Drive, the Drive sign-in permission) is dropped.

- **Uploads:** PDF or Word (.docx), up to 4 MB (Vercel takes request bodies up to 4.5 MB). The type comes from the file's first bytes and must match the extension. Every upload is kept, so the Profile holds many resumes; uploading again adds another. Each can be opened, downloaded or deleted (up to 50 kept).
- **Storage:** Postgres, table `profile_resumes` (migration `0029_profile_resumes`) with the bytes in a `bytea` column. No new service or keys, and the files are backed up with the rest of the data.
- **Uploading changes nothing else.** Each file gets an Autofill from this resume button; only that reads it, with the Claude API (PDF sent as a document, DOCX as extracted text), and shows the changes against the form to accept field by field, section by section or all. Nothing is stored until Save.
- **Build order:** 1. uploads (built), 2. Autofill (built 25 Oct 2026), needing `ANTHROPIC_API_KEY`, 3. remove Drive and the OpenAI import (built 25 Oct 2026; `google_connections`, `artifact_selections` and the old `profile_imports` columns stay, per the migration rule).
- **Autofill** (Ledger direction, `docs/mockups/profile.md`): Claude (`claude-opus-5-5`, structured output against the same field schema the Drive import used) reads one file into a draft, kept as a `pending` row in `profile_imports` with `resume_file_id` (migration `0030_profile_autofill`; `drive_file_id` is now nullable). The side panel lists every field the file fills with something different from the form, grouped by section: one change per contact field, the links, the summary, each list section as a whole, and each local field. All are picked to start; Accept puts the picked ones in the form, Save keeps them and marks the row applied. A field the file leaves empty never clears one. Sections the file fills with what is there already fold into one "match" line. A file's row shows In review while its Autofill is open or not saved, then Applied with the date of the last saved one, else Not used. Deleting the file keeps the row, with `resume_file_id` cleared.
- **API:** `GET/POST /api/profile/resumes` (list, upload as form field `file`), `GET/DELETE /api/profile/resumes/<id>` (a PDF opens inline unless `download=1`), `POST /api/profile/resumes/<id>/autofill` (returns `importId`, `draft`, `fileName`; 503 without `ANTHROPIC_API_KEY`, 422 when the file can't be read).

## Step 4 design

Built 24 Oct 2026 inside the Portfolio's one Publish (`docs/architecture/portfolio.md`) instead of a separate `/r/<slug>` page with its own publish. That keeps one Publish and one public read path; the "Public link" section above is the older plan.

- **Link:** `GET /api/public/portfolio/resume`, the live snapshot printed by the same renderer as the Resume page. There is one owner, so there is no slug. `download=1` sends it as a file.
- **What prints:** only what the snapshot holds (`publishedResumeDetails` in `apps/web/src/features/portfolio/snapshot.ts`): no phone, local fields or education notes, and no email unless Show email is on in Portfolio (off by default, agreed 24 Oct 2026; it goes live on the next Publish).
- **Template and paper:** Publish copies the Resume page's choice into `snapshot.resume`. Changing it goes live on the next Publish, like every other edit. Snapshots from before have none and print as Classic on Letter.
- **Public rules:** no session, `noindex`, `no-store`, 404 when unpublished. The Portfolio page has an Open resume link next to Open snapshot.

## Step 3 design

Agreed 14 Oct 2026: summary and bullets only, one pass with inline review, an optional target role, and tips instead of invented numbers.

- **Where:** an Improve writing card on Details, above the form, with an optional Target role field (placeholder: the headline).
- **What it changes:** the summary (it writes one when empty) and each experience and project bullet. Names, titles, dates, skills and everything else stay as typed.
- **Review:** one list of suggestions, each with where it sits, the old line struck through, the new line, and Accept or Undo; Accept all for the rest. Accepted lines go into the form like typing would; nothing is stored until Save. A line edited since the rewrite isn't overwritten: it shows "Line changed since".
- **Facts only:** the prompt forbids new tools, results, purposes or numbers. `checkRewrite` in `packages/domain/src/rewrite.ts` then drops any suggestion with a number that appears nowhere in the Profile (dates count). Where a number or result would help, a tip says what to add.
- **Tense:** present for a current role, past for the rest.
- **Record:** each run is kept in `profile_rewrites` (append-only, migration `0021_profile_rewrites`) with the target role, suggestions, prompt version and model.
- **API:** `POST /api/profile/rewrite` with the form's details (unsaved edits included) and the target role. It needs experience or a project, and checks the details like a save before any AI call.

## Step 2 design

Agreed 13 Oct 2026: server-made PDF, Letter or A4, saved details only, its own page.

- **Page:** `/profile/resume`, the Resume section under Profile. Template switch (Classic, Compact, Technical), paper switch (Letter, A4), the PDF preview, and Download PDF. Before the first save it shows "No details saved" with Add details.
- **One renderer:** `@react-pdf/renderer` draws the PDF on the server (`apps/web/src/features/profile/resume-pdf.tsx`). The preview is that same PDF in a frame, so preview and download can't differ.
- **Saved details only:** the PDF reads the saved Profile. Unsaved form edits don't show until Save.
- **Remembered choice:** `profiles.template` and `profiles.paper` (migration `0018_resume_settings`, defaults `classic` and `letter`). Choosing doesn't count as saving details.
- **Print rules** in `packages/domain/src/resume.ts`: section order per template, standard headings, one date format ("Apr 2023 – Present"), the contact line in the body, links as plain addresses, and the download name ("Name Resume.pdf"). Local fields are never printed.
- **API:** `GET /api/profile/resume?template=&paper=&download=1` returns the PDF; `PUT /api/profile/resume` saves the choice.
- **Tests:** `resume.test.ts` renders every template on both paper sizes and reads the text back as an ATS would. @react-pdf publishes some files for `import` only, so the test bundles `resume-pdf.tsx` to ESM with esbuild before loading it.

## Step 1 design

### Routes and navigation

- Profile lives at `/profile`. `/` redirects to `/profile`, so old bookmarks and the brand link keep working.
- The shell's `resume` module becomes `profile` (label Profile, sections: Details, Drive file).
- `docs/product/app-language.md` gets a Profile word list.

### Data

New tables, added only (the existing ones stay, per the migration rule):

- `profiles`: one row per user. `user_id` (primary key), `details` jsonb typed as `ProfileDetails` from `@ken-os/domain` (the local-fields switch is `details.local.enabled`), `updated_at`.
- `profile_imports`: append only. `id`, `user_id`, `drive_file_id`, `drive_modified_time`, `draft` jsonb (`ProfileDetails`), `prompt_version`, `model`, `status` (`pending`, then `applied` when a save includes it), `created_at`, `applied_at`. Discarding a draft leaves it `pending`; step 5 reads the latest applied import.

The picked file stays in `artifact_selections` (`purpose = primary_resume`), as it is today.

### Code

- `packages/domain/src/profile.ts`: `ProfileDetails` type, empty profile, field limits.
- `packages/domain/src/profile.ts` also holds `normalizeProfile` (one checker: `save` mode refuses bad input with the field name, `import` mode cleans AI output) and `mergeImport` (file values fill the form, sections the file lacks keep what was saved).
- `packages/drive`: `getResumeText(file, token)`. Google Docs use the existing text export. PDF uses `unpdf`, DOCX uses `mammoth` (two new dependencies). Scanned PDFs with no text return a clear error.
- `packages/agents/src/profile/import.ts`: the import agent and `PROFILE_IMPORT_PROMPT_VERSION`.
- `apps/web/src/features/profile/`: `store.ts` (read, save, validate, imports), `api.ts` (route guard, same shape as Engineering's `labRoute`), `routes.ts`, pure tests.
- `apps/web/src/app/profile/page.tsx` and `components/profile/`: the form, built from shadcn primitives. Missing primitives (`field`, `select`, `checkbox`) are added from the registry.
- API: `GET/PUT /api/profile`, `POST /api/profile/import` (extract and parse the picked file, return the draft and save a pending import row).
- `scripts/verify-profile.ts` and `test:db:profile` for the store against local Postgres.

The existing preview, download and Open in Drive actions move into a "Drive file" section on the Profile page.

The Resume assistant (chat about the resume) is removed in step 1. Step 3's rewrite, with accept or undo per change, replaces it. `/api/resume/ask` and `askResumeAgent` go with it.

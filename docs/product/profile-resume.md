# Profile and resume builder

Status: proposed, 12 Oct 2026. Replaces the Resume module. Decisions below were agreed with the owner in chat on 12 Oct 2026.

## The idea in one line

Ken OS stores the owner's career details as structured fields, and every resume is a view of those fields through a template.

Today Ken OS stores a pointer to one Drive file. After this change it stores the content itself, so templates, AI writing, a public link and saving to Drive all build on the same data.

## Decisions

| Question | Decision |
|---|---|
| Where it lives | A top-level **Profile** module replaces the Resume module. |
| Engineering's "Profile" tab | Renamed **Standing** on screen. URLs (`/engineering/profile/...`), code names and the `lab_profile` table stay. |
| Job market | International fields by default. Optional local fields (photo, birthdate, civil status, nationality, full address) are off unless turned on, and ATS templates never print them. |
| Flow order | Details first, then the AI pass, then preview with a template switcher. Switching templates never reruns the AI. |
| Drive reading | The picked Drive file is read only. When it changes, Ken OS shows what changed and the owner approves before anything is overwritten. |
| Drive writing | Ken OS saves its own file to Drive when the owner turns that on. The original picked file is never written. |
| Public link | Shows a published snapshot. Edits go live only on republish. Phone and address hidden by default. `noindex` by default. |

## Two ways in, one form

Both flows end in the same Profile form.

- **Import from Drive.** Choose a resume with the existing Google Picker. Ken OS extracts the text, the AI turns it into fields, and the owner reviews them in the form before saving. Nothing is saved until the owner saves.
- **Build from scratch.** The form opens prefilled with what Ken OS already knows (name and email from sign-in), and the owner fills the rest.

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

The first page in Ken OS anyone can open without signing in.

- Lives at `/r/<slug>`, so it never clashes with app routes.
- The slug is chosen by the owner or random, lowercase, unique.
- Publish saves a snapshot. Unpublish makes the link return 404. Edits never go live until republish.
- Phone, address and every local field are hidden unless the owner turns each one on.
- `noindex` by default, with a switch to allow search engines.
- PDF download from the same page.
- No `WorkspaceShell`, no term lookup, no session reads, no email or user id in the page.

`docs/architecture/auth-sign-in.md` and `docs/architecture/overview.md` get a section on public pages when this ships.

## Drive sync

Two one-way paths, never a loop.

- **Drive to Ken OS.** Each import stores the Drive file's `modifiedTime`. On page load, if Drive reports a newer time, Profile shows "Drive file changed" with a Review action. Review runs the import again and shows the new fields against the saved ones. The owner accepts per section.
- **Ken OS to Drive.** When turned on, saving a resume writes a Google Doc (or PDF) that Ken OS created, in the owner's Drive. The current `drive.file` permission covers files the app creates, so no new Google permission or verification is needed. This is a write to an external system, so it is off until the owner turns it on, and the screen shows when it last saved.

## Build order

1. **Profile and import.** Profile page, form, import from Drive with review, prefill, navigation change, Engineering rename.
2. **Templates and preview.** Three templates, preview with a switcher, PDF download.
3. **AI rewrite.** Rewrite with accept or undo per change.
4. **Public link.** Publish, unpublish, slug, privacy switches.
5. **Drive sync.** Change detection and review, saving to Drive.

Each step ships on its own and leaves the app working.

## Step 1 design

### Routes and navigation

- Profile lives at `/profile`. `/` redirects to `/profile`, so old bookmarks and the brand link keep working.
- The shell's `resume` module becomes `profile` (label Profile, sections: Details, Drive file).
- The Engineering tab label, page title and back links change from Profile to Standing. `docs/product/app-language.md` gets a Profile word list and the Engineering row updated.

### Data

New tables, added only (the existing ones stay, per the migration rule):

- `profiles`: one row per user. `user_id` (primary key), `details` jsonb typed as `ProfileDetails` from `@ken-os/domain`, `local_fields` boolean, `updated_at`.
- `profile_imports`: append only. `id`, `user_id`, `drive_file_id`, `drive_modified_time`, `draft` jsonb (`ProfileDetails`), `prompt_version`, `model`, `status` (`pending`, `applied`, `dismissed`), `created_at`.

The picked file stays in `artifact_selections` (`purpose = primary_resume`), as it is today.

### Code

- `packages/domain/src/profile.ts`: `ProfileDetails` type, empty profile, field limits.
- `packages/drive`: `getResumeText(file, token)`. Google Docs use the existing text export. PDF uses `unpdf`, DOCX uses `mammoth` (two new dependencies). Scanned PDFs with no text return a clear error.
- `packages/agents/src/profile/import.ts`: the import agent and `PROFILE_IMPORT_PROMPT_VERSION`.
- `apps/web/src/features/profile/`: `store.ts` (read, save, validate, imports), `api.ts` (route guard, same shape as Engineering's `labRoute`), `routes.ts`, pure tests.
- `apps/web/src/app/profile/page.tsx` and `components/profile/`: the form, built from shadcn primitives. Missing primitives (`field`, `select`, `checkbox`) are added from the registry.
- API: `GET/PUT /api/profile`, `POST /api/profile/import` (extract and parse the picked file, return the draft and save a pending import row).
- `scripts/verify-profile.ts` and `test:db:profile` for the store against local Postgres.

The existing preview, download and Open in Drive actions move into a "Drive file" section on the Profile page.

The Resume assistant (chat about the resume) is removed in step 1. Step 3's rewrite, with accept or undo per change, replaces it. `/api/resume/ask` and `askResumeAgent` go with it.

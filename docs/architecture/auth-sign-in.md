# Sign-in page and flow

Status: implemented 10 Oct 2026 on `feat/auth-sign-in` (all three slices on one branch). The eight hand checks in §8 still need the hosted app.

### Implementation notes

- `requireSession(path, query)` takes the page's query too, so a deep link like `/engineering/learn?area=web` comes back whole.
- The callback's decisions live in `src/lib/auth-flow.ts` (`finishSignIn`, `finishDriveGrant`), so `pnpm --filter @ken-os/web test:db:auth` can run both intents against local Postgres without Google.
- A Drive state mismatch, or a grant from a different Google account than the session, reports `drive_error=google`.
- `signin` checks the owner email before `email_verified`, so an unverified stranger sees "doesn't have access", and an unverified owner address sees "isn't verified".
- Tokens issued before this change have no `auth_time`; their issue time stands in for it, so existing sessions keep working.
- `src/lib/google.ts` throws `DriveAccessError` (`not_connected` or `disconnected` on `invalid_grant`); the Resume page and the picker route use it to show Connect or Reconnect Google Drive.
- "Not set up" also covers a missing `GOOGLE_CLIENT_SECRET` or `APP_URL`.

## Decision

Ken OS gets a real sign-in page, an error state for every way sign-in can fail, and a flow that returns the owner to where they were, stops asking for Google consent every time, keeps the session alive while it's in use, and asks for Drive access only when the Resume needs it.

Ken OS stays **owner-only with Google sign-in**. These boundaries are kept exactly: OAuth state and PKCE, the `OWNER_EMAIL` check on a verified Google email, the encrypted Drive refresh token, origin checks on POST routes, and the session checks in API routes.

Out of scope: more users or sign-in methods, and a single guard replacing the per-page session checks (a separate structural change). The proxy added here only renews sessions; it doesn't decide who gets in.

## Today

| #   | Today                                                                       | Problem                                                                          |
| --- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | Every sign-in error is a raw JSON response from `/api/auth/google/callback` | No page, no way back, no "Try again"                                             |
| 2   | Signed-out pages `redirect("/")`                                            | The page you wanted is lost                                                      |
| 3   | `prompt: "consent"` on every sign-in                                        | The Google consent screen every time                                             |
| 4   | Sign-in asks for `drive.file` and fails without it                          | Engineering and Terms don't need Drive, but you can't get in without granting it |
| 5   | The session is a fixed 7 days from sign-in, then silently gone              | A weekly bounce with no explanation                                              |
| 6   | Signing in with the wrong Google account has no "use another account" path  | You have to sign out of Google yourself                                          |
| 7   | `/` is both the sign-in page and the Resume page                            | Two jobs on one route                                                            |

## 1. Routes

| Route                          | Signed out                                                                             | Signed in                                                |
| ------------------------------ | -------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `/sign-in`                     | The sign-in page (§2)                                                                  | Redirect to `next` if valid, else `/`                    |
| `/`                            | Redirect to `/sign-in`                                                                 | Resume, as today                                         |
| Any other page                 | Redirect to `/sign-in?next=<path and query>`                                           | The page                                                 |
| `/api/auth/google`             | Starts Google sign-in, carrying `next`                                                 | Same; used for "Use another account"                     |
| `/api/auth/google/callback`    | Never shows JSON; redirects to `next` on success or `/sign-in?error=<code>` on failure | Same                                                     |
| `/api/auth/google/drive` (new) | 401                                                                                    | Starts the Drive-access grant (§4)                       |
| `/api/auth/signout`            | POST only, origin-checked as today                                                     | Clears the session, redirects to `/sign-in?signed_out=1` |
| API routes                     | 401 JSON, as today                                                                     | Unchanged                                                |

The signed-out branch moves out of `app/page.tsx` into `app/sign-in/page.tsx`.

### The `next` parameter

- A helper `requireSession(path)` in `src/lib/session.ts` replaces the 12 `if (!session) redirect("/")` lines. It redirects to `/sign-in?next=<path>`, or `/sign-in?expired=1&next=<path>` when a session cookie was present but no longer valid.
- `next` is accepted only if it is a same-origin path: starts with `/`, not `//` or `/\`, has no scheme, and isn't under `/api/` or `/sign-in`. Anything else becomes `/`. One function, `safeNext(value)`, used everywhere, with unit tests for each rejected shape.
- During the Google round trip, `next` travels in a short-lived `ken_os_oauth_next` cookie with the same options as the state and verifier cookies (httpOnly, lax, 10 minutes), and is deleted in the callback.

## 2. The sign-in page

Built from shadcn's `login` block (`pnpm dlx shadcn@latest add login-01`), trimmed to Google only, in the shadcn default look from `docs/architecture/design-system-shadcn-setup.md`. A centered `Card`, nothing else on the page: no tagline, no product tour.

| Part                                       | Text                                                                    |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| Wordmark                                   | Ken OS                                                                  |
| Card title                                 | Sign in                                                                 |
| Card description                           | Owner only                                                              |
| Button                                     | Continue with Google (Google "G" mark, `variant="outline"`, full width) |
| Alert (only when there's something to say) | See the states table                                                    |

`<title>`: "Sign in · Ken OS". The button is a link to `/api/auth/google?next=<next>`. While navigating away it shows "Opening Google…" and is disabled, so a double click doesn't start two flows.

### States

Shown as a shadcn `Alert` above the button. Error codes come from the callback as `?error=<code>`; the page maps codes to text, never showing raw text from a URL.

| State            | Trigger                                                             | Alert                                                                                                 | Actions                                                               |
| ---------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Plain            | No query                                                            | none                                                                                                  | Continue with Google                                                  |
| Signed out       | `?signed_out=1`                                                     | "Signed out" (default alert)                                                                          | Continue with Google                                                  |
| Session ended    | `?expired=1`                                                        | "Session ended. Sign in again"                                                                        | Continue with Google                                                  |
| Cancelled        | `?error=cancelled` (Google returned `access_denied`)                | "Sign-in cancelled"                                                                                   | Continue with Google                                                  |
| Link expired     | `?error=expired` (state mismatch, missing cookies, `invalid_grant`) | "Sign-in expired. Try again"                                                                          | Continue with Google                                                  |
| Wrong account    | `?error=wrong_account`                                              | "This Google account doesn't have access" (destructive)                                               | **Use another account** (starts sign-in with `prompt=select_account`) |
| Unverified email | `?error=unverified`                                                 | "This Google account's email isn't verified" (destructive)                                            | Use another account                                                   |
| Google failed    | `?error=google` (token or userinfo request failed)                  | "Google sign-in failed. Try again" (destructive)                                                      | Continue with Google                                                  |
| Not set up       | `OWNER_EMAIL` or Google keys missing                                | "Sign-in isn't set up" (destructive); in development only, the setup hint naming the missing variable | Button disabled                                                       |

The wrong-account alert doesn't echo the email that was tried, so the page never shows an address to a visitor.

## 3. Consent and account choice

- Sign-in sends `prompt=select_account` instead of `prompt=consent`. Google shows its account chooser, then skips the consent screen once it's been granted.
- Sign-in no longer sends `access_type=offline` and doesn't need a refresh token; that belongs to the Drive grant (§4).
- "Use another account" is the same request with `prompt=select_account`, which always shows the chooser.

## 4. Drive access, separate from sign-in

Sign-in scopes become `openid email profile`. Drive is a second, incremental grant, asked for only when it's needed.

- **New route** `/api/auth/google/drive` (session required): the same state, PKCE and `next` handling, with `scope=https://www.googleapis.com/auth/drive.file`, `include_granted_scopes=true`, `access_type=offline` and `prompt=consent`. Google needs `consent` here to return a refresh token.
- **Shared callback.** A `ken_os_oauth_intent` cookie (`signin` or `drive`) tells `/api/auth/google/callback` which flow it's finishing.
  - `signin`: verify the owner, upsert the user, create the session. No Drive requirement.
  - `drive`: require an existing session for the same Google `sub`, require the `drive.file` scope and a refresh token, store it encrypted as today, then redirect to `next` (default `/`).
  - Drive failures redirect to `next` with `?drive_error=<code>` (`cancelled`, `scope`, `google`), shown as an alert on the Resume page, never as JSON.
- **Resume page.**
  - No Drive connection yet: the empty state reads "Google Drive not connected / Connect it to choose your resume", with **Connect Google Drive**.
  - A connection whose token Google rejects (revoked or expired): "Google Drive disconnected" with **Reconnect Google Drive**, which goes to `/api/auth/google/drive`, not to sign-in.
  - "Reconnect Google" (the sign-in link) is removed from this page.
- **Existing installs:** today's stored refresh token already has `drive.file`, so the owner isn't asked again after this ships.

## 5. Session length

- **Rolling session:** 30 days since last use, renewed at most once a day, never longer than 90 days from sign-in.
- The JWT gains an `auth_time` claim (sign-in time). The 90-day cap is checked against it; past it, the session is invalid and the owner signs in again.
- **Renewal happens in `src/proxy.ts`**, the only place outside a route handler that can set cookies:
  - Matcher: page routes only. Exclude `/api/`, `/_next/`, static files and `/sign-in`.
  - If the session cookie is valid and was issued more than 24 hours ago, re-sign it with a fresh 30-day expiry (same `sub`, `email`, `auth_time`) on the response.
  - If it's invalid or missing, do nothing. The page's `requireSession` handles the redirect, so the proxy never decides access.
- `getSession()` keeps checking the owner email on every read, as today.
- An expired or invalid cookie on a page visit leads to `/sign-in?expired=1&next=…` (§1), so the owner sees why.

## 6. Sign out

- The POST route clears the session and redirects to `/sign-in?signed_out=1`.
- It doesn't revoke the Drive token. Signing out of Ken OS isn't disconnecting Drive.
- The sign-out control stays where it is in the shell.

## 7. Files

| File                                        | Change                                                                                        |
| ------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `src/app/sign-in/page.tsx`                  | New: the page and its states                                                                  |
| `src/components/sign-in-card.tsx`           | New: from the shadcn `login-01` block                                                         |
| `src/app/page.tsx`                          | Signed-out branch removed; uses `requireSession("/")`                                         |
| 12 page files                               | `requireSession(<path>)` instead of `redirect("/")`                                           |
| `src/lib/session.ts`                        | `requireSession`, `safeNext`, `auth_time`, 30-day expiry, `renewSession` helper for the proxy |
| `src/proxy.ts`                              | New: daily renewal only (§5)                                                                  |
| `src/app/api/auth/google/route.ts`          | Sign-in scopes, `prompt=select_account`, no offline access, `next` and intent cookies         |
| `src/app/api/auth/google/drive/route.ts`    | New (§4)                                                                                      |
| `src/app/api/auth/google/callback/route.ts` | Both intents; every failure redirects with a code; `access_denied` → `cancelled`              |
| `src/app/api/auth/signout/route.ts`         | Redirect to `/sign-in?signed_out=1`                                                           |
| `src/components/resume-workspace.tsx`       | Connect and Reconnect Google Drive states (§4)                                                |
| `src/lib/auth-errors.ts`                    | New: error codes → alert text, one place                                                      |

## 8. Tests and checks

- **Unit:**
  - `safeNext`: accepts `/engineering/learn?x=1`; rejects `//evil.com`, `/\evil.com`, `https://evil.com`, `/api/x`, `/sign-in`, an empty string and undefined.
  - Error-code mapping covers every code in §2.
  - Session renewal: skips under 24 hours, renews over 24 hours, refuses past 90 days.
- **Local Postgres check:** extend `scripts/verify-resume.ts`, or add `test:db:auth`, to cover a `drive` intent finishing against a stored user, and a `signin` intent that doesn't touch `google_connections`.
- **By hand on the hosted app**, since Google can't be faked locally:
  1. First sign-in
  2. A second sign-in skipping consent
  3. A deep link round trip
  4. Cancel at Google
  5. The wrong account
  6. Connecting Drive from the Resume page
  7. Revoking Ken OS in Google account settings, then Reconnect Google Drive
  8. Signing out

## 9. Slices

| #   | Branch                 | Covers                                                                                                                                    |
| --- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `feat/sign-in-page`    | §1 and §2: `/sign-in`, states, error codes from the callback, `next` with `safeNext`, `requireSession` in the 12 pages, sign-out redirect |
| 2   | `feat/drive-grant`     | §3 and §4: consent and account choice, the separate Drive grant, the shared callback intents, Resume states                               |
| 3   | `feat/rolling-session` | §5: `auth_time`, 30 and 90 days, `proxy.ts` renewal                                                                                       |

Slice 1 can ship on today's look; it moves to the shadcn default with the rest of the app.

## 10. Done when

1. No sign-in path shows JSON in the browser.
2. A signed-out deep link comes back to the same page after sign-in.
3. A second sign-in shows Google's account chooser but not the consent screen.
4. Signing in works without granting Drive. Choosing a resume asks for Drive once.
5. Using the app daily never signs the owner out; 30 idle days or 90 days total does, with "Session ended".
6. The wrong account sees "This Google account doesn't have access" and can pick another.
7. `pnpm test`, `pnpm check` and `pnpm build` pass, and all eight hand checks pass on the hosted app.

## Open questions

- **Session lengths:** 30 days idle and 90 days maximum are a recommendation. Shorter is safer; this app holds a Drive token, so don't go longer.
- **Revoking Drive on sign-out:** not proposed. Say if signing out should also disconnect Drive.

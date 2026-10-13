# Engineering with Claude: a connector between claude.ai and Ken OS

> History since 13 Oct 2026: Engineering is now built from [engineering-claude-first.md](engineering-claude-first.md). Read this file for background only.

Status: all three slices built, 12 and 13 Oct 2026 (§10a to §10c). The connector works on the hosted app: added in claude.ai, signed in, 8 tools listed (13 Oct 2026).

## Decision

Engineering stops being only an app you click through. **Claude (claude.ai) is where the owner thinks and talks; Ken OS is where they code, get checked, and see where they are.** A Ken OS connector inside Claude joins the two.

The owner's feedback on the rebuilt loop: the topic editor is good, but the experience feels like a traditional learning system. The results are fixed, a confusing point can't be followed up, and it all feels like an app. The wanted experience is like a chat, but enclosed and progressive. It shouldn't mean rebuilding Claude or ChatGPT inside Ken OS.

Owner decisions (12 Oct 2026):

| Question                     | Decision                                                                                                                     |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Where the conversation lives | claude.ai, through a custom connector. The owner has Claude Pro. A chat panel inside Ken OS is kept on file as option B (§9) |
| Who writes topic content     | Claude, on demand, in the conversation. Ken OS's built-in writers stay as a fallback                                         |
| Practice                     | Stays in Ken OS as graded reviews. Quizzing in Claude is fine but records nothing                                            |

## 1. The split

|                                                          | Claude                                      | Ken OS                                  |
| -------------------------------------------------------- | ------------------------------------------- | --------------------------------------- |
| Explaining, follow-up questions, "another way", examples | Yes                                         |                                         |
| Writing a topic's lesson, exercise and proof question    | Drafts and saves them through the connector | Stores, checks and shows them           |
| Writing and running code                                 |                                             | The editor and the isolated test runner |
| Seeing the owner's code and test results                 | Reads them through the connector            | Autosaves them                          |
| Grading a proof, deciding Proven                         | Never                                       | Only here, by its own Assessor          |
| Path, progress, history, what's due                      | Reads them                                  | Owns them                               |
| Practice grades and review dates                         | Never                                       | Only here                               |

## 2. Three rules that keep progress honest

The same conversation that teaches the owner must not also pass them.

1. **Claude never decides Proven.** The connector has no tool that grades, submits a proof, marks a topic Proven, or changes a grade, a review date or the path. The proof is answered in Ken OS and graded by Ken OS's Assessor, which never sees the chat.
2. **The rubric is never Claude's.** Claude may draft a topic's proof question, but grading always uses that topic's approved assessment points (`content/engineering-lab/curriculum/points.yaml`). A question Claude writes is accepted only if it names which of those points it tests.
3. **An exercise freezes once it's started.** The first run of an exercise version locks it. A later `save_exercise` creates a new version; the old one and its runs stay as they were. Tests can't get easier mid-attempt.

Chat itself is never evidence. Only passed exercises and graded proofs count.

## 3. The connector

Ken OS hosts a **remote MCP server** that the owner adds in claude.ai under Customize → Connectors → Add custom connector. claude.ai connects from Anthropic's cloud, so the endpoint is public, signed in with OAuth, and owner-only like the rest of Ken OS.

### Endpoint

- `POST /api/mcp`: the MCP endpoint, using Streamable HTTP. Build it with the official MCP TypeScript SDK, or a maintained Next.js adapter for it; the implementer picks one and records the version.
- Stateless: each request is authorized by its bearer token. No server-side session.
- Tool results are plain text plus structured content, kept small (no whole lesson histories).

### Tools

The tool layer lives in one module, `features/engineering-lab/agent-tools.ts`, so option B (§9) can reuse it unchanged. Each tool validates its input with a schema and records an entry in `lab_topic_events` with `source: "claude"`.

**Read**

| Tool                   | Returns                                                                                                                                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get_current_state`    | Target role, current topic (chapter, step, state), next topics on the path, reviews due today, AI uses left                                                                                                |
| `get_topic(topicId)`   | Title, chapter, area, state, the approved assessment points, the current lesson (if any), the current exercise version's task, starter and tests (never the solution), and whether a proof question exists |
| `get_my_work(topicId)` | The owner's latest autosaved code for the current exercise version, and the last test run: passed, failed, and each failing test's expected and actual output                                              |
| `get_history(topicId)` | Past runs (counts only), proof attempts with grade and feedback, open misconceptions from graded answers                                                                                                   |
| `list_path`            | The owner's path: areas, chapters and topics with their states                                                                                                                                             |

**Write** (content only)

| Tool                                             | Does                                                                                                                                                                                                                                                             |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `save_lesson(topicId, lesson)`                   | Saves a new lesson version in the rebuild's lesson format: core idea, mental model, one formula, code or rule block, a product example, optional Go deeper, and sources. Sources must be on the Researcher's trusted sites; others are dropped and reported back |
| `save_exercise(topicId, exercise)`               | Saves a new exercise version: `runner` (`browser` or `pglite`), task line, `starter`, `tests`, `solution`, `hint`. Starts as **unchecked** (§4)                                                                                                                  |
| `save_proof_question(topicId, prompt, pointIds)` | Saves a proof question that names the approved points it tests. Rejected if it names none or names a point not on that topic                                                                                                                                     |

**Not available, by design:** submitting or grading a proof, marking Proven, recording a test run, changing Practice, the path, the target role or the profile, and anything in other modules (Resume, Skills, Project Memory, Terms).

### Untrusted input

Everything Claude saves is untrusted text, the same as Skills uploads and selected text in Terms:

- Lessons render through the existing safe Markdown renderer.
- Exercise code only ever runs in the existing isolated runner (browser worker or PGlite in the page), never on the server.
- Sizes are capped:
  - A lesson: 20,000 characters
  - Each exercise file: 20,000 characters
  - A proof prompt: 1,000 characters
- **Write limits:** 40 writes a day across all write tools, returning a clear error when reached. Claude's writes cost Ken OS nothing, but this stops a runaway loop.

### Sign-in (OAuth)

Follow the MCP authorization spec, with Ken OS as its own authorization server, which signs the owner in through the existing Google sign-in.

- **Metadata:** `/.well-known/oauth-protected-resource` and `/.well-known/oauth-authorization-server`.
- **`/oauth/authorize`:** requires a Ken OS session (otherwise `/sign-in?next=…` from the sign-in spec), then shows a consent page in app language. Title "Connect Claude", list "Read your Engineering progress and code" and "Save lessons, exercises and proof questions", buttons **Allow** and **Deny**.
- **`/oauth/token`:** authorization code with PKCE (S256 only), and refresh tokens.
- **Client registration:** support both of claude.ai's options, "Use Claude's published identity" (client ID metadata documents) and "Register automatically" (`/oauth/register`, dynamic client registration). Verify against what claude.ai sends when the connector is added.
- **Redirect URIs:** allowed only on `claude.ai` and `claude.com` over HTTPS, from an env list `MCP_ALLOWED_REDIRECT_HOSTS`. Read the exact callback from the first real authorize request and keep the list to it.
- **Tokens:** random values stored only as hashes, scoped `engineering`. Access tokens last 1 hour, refresh tokens 30 days, rotated on use.
- **Revoking:** a **Connections** section on the Engineering Profile page lists connected clients with their last use, and has **Disconnect**.
- **Owner only:** the token's user must be the `OWNER_EMAIL` user. Every tool call re-checks it.

## 4. Claude-written exercises

Exercises today come from the repo (`labs/`). Claude's are stored in the database and versioned.

- **Storage:** a new table `lab_exercises` with id, topic, version, source (`repo` or `claude`), runner, task, starter, tests, solution, hint, `checked` (`unchecked`, `valid` or `invalid`) and `locked_at`. The repo labs keep working as version 0, source `repo`.
- **Checking happens in the owner's browser**, because the code must only run in the isolated runner:
  - The first time a new version is opened, the page quietly runs the solution (it must pass every test) and the starter (it must fail at least one).
  - Valid: the exercise shows.
  - Invalid: the page says "This exercise doesn't check out", with what failed, and the previous valid version stays in use. `get_topic` then reports it, so Claude can fix it.
- **Locking:** the owner's first run locks the version (§2). A newer valid version appears as "New exercise from Claude" with **Switch**. Switching starts a fresh attempt; old runs stay on the old version.
- **Proof needs a pass** on the version the owner is on, without having opened its solution first, as the rebuild already requires.
- **Solutions:** `get_topic` never returns them, and the Claude Project instructions say not to reveal one before the owner has tried. The owner can still open it in Ken OS, which costs the proof as today.

## 5. Autosave

Claude can only help with code it can see.

- The topic editor autosaves the current code 2 seconds after typing stops into a new `lab_exercise_drafts` row (user, exercise version, code, updated time), and shows "Saved" next to the editor.
- Test runs keep being recorded as today, with each failing test's expected and actual output kept for `get_my_work`.

## 6. Ask Claude

- Each topic page gets **Ask Claude** next to the step bar.
- It copies a starter message, "Teach me <topic name> (Ken OS topic `<topicId>`). Start by checking where I am.", and opens the owner's Claude Project in a new tab.
- The project URL comes from `KEN_OS_CLAUDE_PROJECT_URL`.
- A toast says "Copied. Paste it in Claude".
- If the variable isn't set, the button isn't shown.

## 7. The Claude Project

The owner creates a Claude Project named "Ken OS Engineering", turns on the Ken OS connector, and pastes these instructions. They're kept in the repo at `docs/product/claude-project-instructions.md`, so changes are reviewed like code.

> You are my engineering tutor, working inside my Ken OS Engineering path. Always call `get_current_state` first, and `get_topic` before teaching a topic. Teach one topic at a time, the one Ken OS says is current unless I choose another. Ask before you tell: check what I already think, then explain. Keep explanations short and follow my questions wherever they go within the topic. When I'm ready to practise, write the exercise with `save_exercise`, then tell me to open it in Ken OS. When I'm stuck, read my code and the failing test with `get_my_work` and ask me a question that points at the problem; don't give me the fix or the solution unless I ask twice. Never tell me a topic is proven or what my grade will be; Ken OS decides that. When a lesson would help, write it with `save_lesson`, using only trusted sources. Write in plain language, no em dashes.

## 8. Files

| File                                                                                                          | Change                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/features/engineering-lab/agent-tools.ts`                                                                 | New: the tool layer (§3), shared with option B                                                                                                                              |
| `src/app/api/mcp/route.ts`                                                                                    | New: the MCP endpoint                                                                                                                                                       |
| `src/app/.well-known/oauth-protected-resource/route.ts`, `.../oauth-authorization-server/route.ts`            | New: OAuth metadata                                                                                                                                                         |
| `src/app/oauth/authorize/page.tsx`, `src/app/api/oauth/token/route.ts`, `src/app/api/oauth/register/route.ts` | New: OAuth                                                                                                                                                                  |
| `src/lib/schema.ts` + migration                                                                               | `lab_exercises`, `lab_exercise_drafts`, `oauth_clients`, `oauth_tokens` (hashed), `source` columns on lessons and proof questions. Add tables first, per the migration rule |
| `src/features/engineering-lab/topic-store.ts`                                                                 | Exercise versions, checking, locking, autosave, the `claude` source                                                                                                         |
| `src/components/engineering/*` topic page                                                                     | Ask Claude, the "Saved" status, new-exercise notice, invalid-exercise notice                                                                                                |
| `src/components/engineering/profile.tsx`                                                                      | Connections section                                                                                                                                                         |
| `docs/product/claude-project-instructions.md`                                                                 | New: §7 text                                                                                                                                                                |
| `AGENTS.md`                                                                                                   | Name the connector as another untrusted input, and its no-grading rule                                                                                                      |

## 9. Option B, kept on file: a chat panel inside Ken OS

Built only if option A disappoints: switching tabs feels clumsy, claude.ai can't reach the connector, or Claude can't see enough.

- A chat panel on the right of the topic page, calling the Claude API with the same `agent-tools.ts` tools as function tools, plus the same rules.
- Conversations are stored in Ken OS per topic.
- **Cost:** API calls are billed per token and aren't covered by Claude Pro. It needs a model budget alongside the existing AI-use limit.
- **Effort:** a real chat UI (streaming, history, tool calls shown), which is the rebuild the owner wants to avoid. That's why it's option B.
- **Nothing in option A blocks it,** as long as the tools stay in `agent-tools.ts` and never import route or MCP code.

## 10. Slices

| #   | Branch                         | Covers                                                                                                                                   |
| --- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `feat/engineering-agent-tools` | `agent-tools.ts` with tests, exercise versions, checking and locking, autosave, the `claude` source. No connector yet; testable directly |
| 2   | `feat/engineering-mcp`         | OAuth (metadata, authorize with consent, token, registration), `/api/mcp`, Connections on Profile, write limits                          |
| 3   | `feat/engineering-ask-claude`  | The Ask Claude button, the Project instructions file, docs and rules updates                                                             |

## 10a. Slice 1 as built

Decisions made while building slice 1, 12 Oct 2026. Where they differ from the sections above, these win.

**Where things are**

| File                                                                | Holds                                                                                                                                                 |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/domain/src/engineering-lab/exercises.ts`                  | Picking the current version, judging a check, point ids, the size caps                                                                                |
| `apps/web/src/features/engineering-lab/agent-tools.ts`              | The 8 tools, their zod schemas, `callAgentTool(userId, name, input)`                                                                                  |
| `apps/web/src/features/engineering-lab/exercise-store.ts`           | Exercise versions, the check, locking, Switch, autosave                                                                                               |
| `topic-store.ts`                                                    | Claude's lessons and proof questions, versioned runs with per-test results                                                                            |
| `drizzle/0012_nervous_princess_powerful.sql`                        | `lab_exercises`, `lab_exercise_drafts`, `source` on `lab_lessons`, `lab_questions` and `lab_topic_events`; `lab_lessons.source_packet_id` may be null |
| `/api/lab/topics/[id]/draft`, `/exercise/check`, `/exercise/switch` | Autosave, storing the browser's check, Switch                                                                                                         |

**Decisions**

- **Point ids** are `p1`, `p2`, … in the order `points.yaml` lists a topic's points. `get_topic` lists them with their text. Reordering a topic's points changes its ids, which is fine because the file changes only in a reviewed commit.
- **Only writes record an event.** Each write tool adds a `lesson_saved`, `exercise_saved` or `proof_question_saved` event with `source: "claude"`. Reads don't: `get_current_state` and `list_path` have no topic, and logging every read would bury the evidence. Progress ignores these three kinds entirely, including the last activity date.
- **Switch** records an `exercise_switched` event. It closes Prove until the new version passes, like opening the solution.
- **The current version** is the one the owner last ran or switched to. Without either, the newest valid version is the default, else the repo lab (the open question below, answered as recommended). A repo lab shared by two topics still counts for both.
- **An open assessment closes the tools**, as it closes lessons. Only `get_current_state` (which reports `assessmentOpen`) and `list_path` answer.
- **Hand-written lessons stay.** `save_lesson` refuses a topic with a hand-written lesson, the same as the Tutor.
- **A Claude proof question** stores the named points as its rubric and "A solid answer shows: …" as its reference answer. The newest proof question is the one the owner answers.
- **Claude's writes don't use Ken OS AI uses.** The daily count skips rows with `source: "claude"`.
- **Claude's exercises** time out at 3 s in the browser runner and 20 s with PGlite, matching the repo labs. A starter that throws counts as failing.
- **Autosave** keeps one row per owner and version (`lab_exercise_drafts`, keyed by the version's lab id), overwritten on each save. Code saved in the browser before autosave comes back once and then autosaves.

**Left for slice 2:** the 40-writes-a-day limit, the OAuth tables, the owner check on each call, and the MCP endpoint. All built in §10b.

**Verified:** `pnpm test` (`exercises.test.ts`, `agent-tools.test.ts`), `pnpm check`, `pnpm build`, and `pnpm --filter @ken-os/web test:db:engineering` against local Postgres. Autosave and "Saved" were checked signed in on the local server on 12 Oct 2026.

## 10b. Slice 2 as built

Built 13 Oct 2026 on `feat/engineering-mcp`. Where these differ from §3, these win.

**Where things are**

| File                                                                                                   | Holds                                                                                                            |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/features/connector/rules.ts`                                                             | Metadata documents, the 401, redirect and metadata-URL checks, PKCE, token hashing                               |
| `apps/web/src/features/connector/oauth-store.ts`                                                       | Registration, metadata clients, consent codes, token exchange, refresh, the token check, Connections, Disconnect |
| `apps/web/src/features/connector/mcp-server.ts`                                                        | The MCP server: the 8 tools from `agent-tools.ts`, built fresh per request                                       |
| `src/app/api/mcp/route.ts`                                                                             | `POST` only, stateless, JSON responses. `GET` and `DELETE` answer 405                                            |
| `src/app/.well-known/oauth-protected-resource/route.ts` and `.../api/mcp/route.ts`                     | RFC 9728 metadata, at both paths claude.ai tries                                                                 |
| `src/app/.well-known/oauth-authorization-server/route.ts`                                              | RFC 8414 metadata                                                                                                |
| `src/app/oauth/authorize/page.tsx`, `src/components/connector/consent.tsx`                             | The consent page                                                                                                 |
| `src/app/api/oauth/authorize/route.ts`                                                                 | Allow and Deny. Checks the request again from scratch                                                            |
| `src/app/api/oauth/token/route.ts`, `.../register/route.ts`                                            | Token endpoint (form-encoded) and registration                                                                   |
| `src/app/api/oauth/connections/[id]/disconnect/route.ts`, `src/components/engineering/connections.tsx` | Connections on Profile                                                                                           |
| `drizzle/0013_tan_warpath.sql`                                                                         | `oauth_clients`, `oauth_grants`, `oauth_tokens`. Additive only                                                   |
| `scripts/verify-connector.ts`                                                                          | `pnpm --filter @ken-os/web test:db:connector`                                                                    |

**Decisions**

- **SDK:** `@modelcontextprotocol/sdk` 1.32.1, with its web-standard Streamable HTTP transport, so the route handler passes the `Request` straight in. No adapter.
- **claude.ai's requirements**, from [Authentication for connectors](https://claude.com/docs/connectors/building/authentication): the callback is `https://claude.ai/api/mcp/auth_callback`; it uses a client metadata URL only when the server metadata lists `client_id_metadata_document_supported` and the method `none`, otherwise it registers itself; it needs S256 PKCE and a real `401` with `resource_metadata`. Both client options work.
- **One table per idea:** a connection (grant) is what the owner allowed once. Codes, access tokens and refresh tokens are rows in `oauth_tokens` under it, stored only as SHA-256 hashes.
- **Metadata URLs are fetched only on allowed hosts** (`MCP_ALLOWED_REDIRECT_HOSTS`, default `claude.ai,claude.com`), with a 5 s timeout, a 10 KB cap and no redirects, and kept for a day. Nothing else is ever fetched, so the URL can't be used to reach internal addresses.
- **Registration** takes public clients only, with redirect URIs on the allowed hosts, and at most 20 a day, since the endpoint is public.
- **The consent page names the app by host**, never by the name it gave itself, and shows where it returns to.
- **Refresh tokens rotate.** Using an old one again revokes the whole connection, since it means the token leaked.
- **Every call re-checks** the token, the connection and that its user is still `OWNER_EMAIL`. Disconnect takes effect on the next call.
- **One scope**, `engineering`. `offline_access` is accepted and ignored; a refresh token is always issued.
- **Write limit:** `CLAUDE_WRITE_LIMIT = 40` saves a day in `agent-tools.ts`, counted from the `source: "claude"` events, so the in-app chat (option B) gets it too. Reads are never limited.
- **Connections** lists connections that were exchanged for tokens and haven't expired or been disconnected.
- **Not supported:** Claude Code's loopback redirects (`http://localhost:<port>/callback`). The spec allows only claude.ai and claude.com. Adding Claude Code later means a port-agnostic loopback match.

**Verified:** `pnpm test` (`rules.test.ts`), `pnpm check`, `pnpm build`, `test:db:connector` (8 checks: registration, authorize, code exchange, `/api/mcp`, write limit, refresh and reuse, Disconnect, owner only) and `test:db:engineering`. On the local server: both metadata documents, the 401, the consent page, a real tool call with a token, and Disconnect on Profile stopping that token.

**Hosted, 13 Oct 2026:** the owner added Ken OS as a custom connector in claude.ai, signed in through the consent page, and saw the 8 tools (§11, step 1). Later that day, the starter message from Ask Claude, pasted into the owner's Project, made Claude call `get_current_state` (§11, step 2). Steps 3 to 6 are not yet tried on the hosted app.

## 10c. Slice 3 as built

Built 13 Oct 2026 on `feat/engineering-ask-claude`.

- **Ask Claude** sits beside the step tabs on every topic page (`components/engineering/ask-claude.tsx`). Changed on 13 Oct 2026 to a dialog: opening it copies the starter message and shows it with "Copied · paste it in Claude", **Copy again** and **Open Claude**. The first version opened Claude straight away, so its "Copied" toast showed on the tab the owner had just left and the step felt silent.
- **No pre-fill:** claude.ai doesn't fill a Project's input from a link. The owner tried `?q=` and `?prompt=` on 13 Oct 2026 and neither worked, so pasting stays.
- **Project links** may be `claude.ai/project/…` or `claude.ai/code/project/…`; any https `claude.ai` link works.
- **`KEN_OS_CLAUDE_PROJECT_URL`** must be an https link on `claude.ai`; anything else hides the button, like leaving it unset (`features/engineering-lab/ask-claude.ts`, tested in `ask-claude.test.ts`).
- **Project instructions** are in `docs/product/claude-project-instructions.md`, with set-up steps. One sentence was added to §7's text: name the assessment points when writing a proof question.
- **`AGENTS.md`** names the connector, its no-grading rule, and `test:db:connector`.

## 11. Done when

1. The owner adds Ken OS as a custom connector in claude.ai, signs in through Ken OS's consent page, and sees the tools.
2. In the Claude Project, asking about the current topic reads the real state and topic from Ken OS.
3. Claude writes an exercise; Ken OS checks it in the browser and shows it, or reports why it's invalid.
4. While stuck, Claude reads the owner's autosaved code and the failing test, and helps without giving the fix.
5. The proof is answered in Ken OS and graded there; nothing Claude does can mark a topic Proven.
6. Disconnect on the Profile page stops the connector at once.
7. `pnpm test`, `pnpm check` and `pnpm build` pass. Steps 1 to 6 work on the hosted app, since claude.ai can't reach a local server.

## Open questions

- ~~**claude.ai's exact OAuth behaviour**~~ Answered 13 Oct 2026: both client options are supported and the real flow works (§10b).
- ~~**Repo exercises versus Claude's**~~ Answered in slice 1 as recommended: the newest valid version is the default, and repo labs stay version 0 (§10a).

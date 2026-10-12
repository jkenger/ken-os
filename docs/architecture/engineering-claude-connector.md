# Engineering with Claude: a connector between claude.ai and Ken OS

Status: proposed, 12 Oct 2026. Not yet implemented. Written for a separate implementation session.

## Decision

Engineering stops being only an app you click through. **Claude (claude.ai) is where the owner thinks and talks; Ken OS is where they code, get checked, and see where they are.** A Ken OS connector inside Claude joins the two.

The owner's feedback on the rebuilt loop: the topic editor is good, but the experience feels like a traditional learning system. The results are fixed, a confusing point can't be followed up, and it all feels like an app. The wanted experience is like a chat, but enclosed and progressive. It shouldn't mean rebuilding Claude or ChatGPT inside Ken OS.

Owner decisions (12 Oct 2026):

| Question | Decision |
|---|---|
| Where the conversation lives | claude.ai, through a custom connector. The owner has Claude Pro. A chat panel inside Ken OS is kept on file as option B (§9) |
| Who writes topic content | Claude, on demand, in the conversation. Ken OS's built-in writers stay as a fallback |
| Practice | Stays in Ken OS as graded reviews. Quizzing in Claude is fine but records nothing |

## 1. The split

| | Claude | Ken OS |
|---|---|---|
| Explaining, follow-up questions, "another way", examples | Yes | |
| Writing a topic's lesson, exercise and proof question | Drafts and saves them through the connector | Stores, checks and shows them |
| Writing and running code | | The editor and the isolated test runner |
| Seeing the owner's code and test results | Reads them through the connector | Autosaves them |
| Grading a proof, deciding Proven | Never | Only here, by its own Assessor |
| Path, progress, history, what's due | Reads them | Owns them |
| Practice grades and review dates | Never | Only here |

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

| Tool | Returns |
|---|---|
| `get_current_state` | Target role, current topic (chapter, step, state), next topics on the path, reviews due today, AI uses left |
| `get_topic(topicId)` | Title, chapter, area, state, the approved assessment points, the current lesson (if any), the current exercise version's task, starter and tests (never the solution), and whether a proof question exists |
| `get_my_work(topicId)` | The owner's latest autosaved code for the current exercise version, and the last test run: passed, failed, and each failing test's expected and actual output |
| `get_history(topicId)` | Past runs (counts only), proof attempts with grade and feedback, open misconceptions from graded answers |
| `list_path` | The owner's path: areas, chapters and topics with their states |

**Write** (content only)

| Tool | Does |
|---|---|
| `save_lesson(topicId, lesson)` | Saves a new lesson version in the rebuild's lesson format: core idea, mental model, one formula, code or rule block, a product example, optional Go deeper, and sources. Sources must be on the Researcher's trusted sites; others are dropped and reported back |
| `save_exercise(topicId, exercise)` | Saves a new exercise version: `runner` (`browser` or `pglite`), task line, `starter`, `tests`, `solution`, `hint`. Starts as **unchecked** (§4) |
| `save_proof_question(topicId, prompt, pointIds)` | Saves a proof question that names the approved points it tests. Rejected if it names none or names a point not on that topic |

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

| File | Change |
|---|---|
| `src/features/engineering-lab/agent-tools.ts` | New: the tool layer (§3), shared with option B |
| `src/app/api/mcp/route.ts` | New: the MCP endpoint |
| `src/app/.well-known/oauth-protected-resource/route.ts`, `.../oauth-authorization-server/route.ts` | New: OAuth metadata |
| `src/app/oauth/authorize/page.tsx`, `src/app/api/oauth/token/route.ts`, `src/app/api/oauth/register/route.ts` | New: OAuth |
| `src/lib/schema.ts` + migration | `lab_exercises`, `lab_exercise_drafts`, `oauth_clients`, `oauth_tokens` (hashed), `source` columns on lessons and proof questions. Add tables first, per the migration rule |
| `src/features/engineering-lab/topic-store.ts` | Exercise versions, checking, locking, autosave, the `claude` source |
| `src/components/engineering/*` topic page | Ask Claude, the "Saved" status, new-exercise notice, invalid-exercise notice |
| `src/components/engineering/profile.tsx` | Connections section |
| `docs/product/claude-project-instructions.md` | New: §7 text |
| `AGENTS.md` | Name the connector as another untrusted input, and its no-grading rule |

## 9. Option B, kept on file: a chat panel inside Ken OS

Built only if option A disappoints: switching tabs feels clumsy, claude.ai can't reach the connector, or Claude can't see enough.

- A chat panel on the right of the topic page, calling the Claude API with the same `agent-tools.ts` tools as function tools, plus the same rules.
- Conversations are stored in Ken OS per topic.
- **Cost:** API calls are billed per token and aren't covered by Claude Pro. It needs a model budget alongside the existing AI-use limit.
- **Effort:** a real chat UI (streaming, history, tool calls shown), which is the rebuild the owner wants to avoid. That's why it's option B.
- **Nothing in option A blocks it,** as long as the tools stay in `agent-tools.ts` and never import route or MCP code.

## 10. Slices

| # | Branch | Covers |
|---|---|---|
| 1 | `feat/engineering-agent-tools` | `agent-tools.ts` with tests, exercise versions, checking and locking, autosave, the `claude` source. No connector yet; testable directly |
| 2 | `feat/engineering-mcp` | OAuth (metadata, authorize with consent, token, registration), `/api/mcp`, Connections on Profile, write limits |
| 3 | `feat/engineering-ask-claude` | The Ask Claude button, the Project instructions file, docs and rules updates |

## 11. Done when

1. The owner adds Ken OS as a custom connector in claude.ai, signs in through Ken OS's consent page, and sees the tools.
2. In the Claude Project, asking about the current topic reads the real state and topic from Ken OS.
3. Claude writes an exercise; Ken OS checks it in the browser and shows it, or reports why it's invalid.
4. While stuck, Claude reads the owner's autosaved code and the failing test, and helps without giving the fix.
5. The proof is answered in Ken OS and graded there; nothing Claude does can mark a topic Proven.
6. Disconnect on the Profile page stops the connector at once.
7. `pnpm test`, `pnpm check` and `pnpm build` pass. Steps 1 to 6 work on the hosted app, since claude.ai can't reach a local server.

## Open questions

- **claude.ai's exact OAuth behaviour** (which client option it uses, its callback URL) must be confirmed against the real "Add custom connector" flow during slice 2. The spec supports both client options so either works.
- **Repo exercises versus Claude's:** once Claude writes a valid exercise for a topic, should it replace the repo lab as the default, or should the repo lab stay first? Recommended: the newest valid version is the default, and repo labs remain version 0.
